import { MetadataStore, profileKey, sessionKey } from "./store";
import { recordResult, scopeFor, sessionAfterResult } from "./coordinator";
import { CliError, requireAwsCli, runAws } from "./cli";
import { AwsConfig, readAwsConfig } from "./config";
import { discoverProfiles, filterProfiles, selectPrimary } from "./profiles";
import { resolveStatus } from "./status";
import { Settings, SsoProfile } from "./types";

export class LoginSelectionError extends Error {}
/** Resolve only discovered, filtered SSO profiles; never execute arbitrary argument-supplied profiles. */
export function selectLoginProfile(config: AwsConfig, settings: Settings, requested?: string): SsoProfile {
  const profiles = filterProfiles(discoverProfiles(config), settings.profileFilter);
  if (!profiles.length) throw new LoginSelectionError("No IAM Identity Center Profiles");
  const name = requested?.trim() || settings.primaryProfile;
  const selected = selectPrimary(
    profiles.map((profile) => ({ profile })),
    name,
  )?.profile;
  if (!selected)
    throw new LoginSelectionError("The selected SSO profile was not found or is excluded by Profile Filter.");
  if (selected.issues.length) throw new CliError("configuration");
  return selected;
}
export async function discoverLoginProfile(settings: Settings, requested?: string): Promise<SsoProfile> {
  return selectLoginProfile(await readAwsConfig(), settings, requested);
}
export async function loginProfile(profile: SsoProfile, settings: Settings, store?: MetadataStore) {
  if (profile.issues.length) throw new CliError("configuration");
  const requestedAt = Date.now();
  const scope = scopeFor(settings);
  const key = sessionKey(profile, scope);
  const execute = async () => {
    const executable = await requireAwsCli(settings.awsCliPath);
    const session = await store?.readSession(key);
    if (!session?.lastLoginAt || session.lastLoginAt < requestedAt - 3000) {
      await runAws(executable, ["sso", "login", "--profile", profile.name], { timeoutMs: 180000, discardOutput: true });
      if (store)
        await store.writeSession(key, {
          failures: 0,
          nextRetryAt: 0,
          lastLoginAt: Date.now(),
          needsLogin: false,
          recoverySeen: session?.recoverySeen,
          notified: false,
        });
    }
    const result = await resolveStatus(profile, executable, Number(settings.threshold) || 30);
    if (store) {
      await store.writeStatus(
        profileKey(profile, scope),
        recordResult(result, await store.readStatus(profileKey(profile, scope))),
      );
      await store.writeSession(key, sessionAfterResult(await store.readSession(key), result));
    }
    return result;
  };
  return store ? store.withSessionLock(key, execute, 190000) : execute();
}
