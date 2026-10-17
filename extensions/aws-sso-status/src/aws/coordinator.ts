import { statSync } from "node:fs";
import { CliError, cliErrorMessage, requireAwsCli } from "./cli";
import { configPath, readAwsConfig } from "./config";
import { discoverProfiles, filterProfiles } from "./profiles";
import { getStatusFromExpiration, resolveStatus } from "./status";
import { MetadataStore, OperationBusyError, profileKey, sessionKey, SessionMetadata, StatusMetadata } from "./store";
import { ProfileStatus, Settings, Snapshot, SsoProfile } from "./types";

export function retryDelay(failures: number): number {
  return Math.min(15 * 60000, 60000 * 2 ** Math.min(4, Math.max(0, failures - 1)));
}
export function isUsable(result: ProfileStatus): boolean {
  return ["Signed In", "Expiring Soon"].includes(result.status);
}
export function scopeFor(settings: Settings): string {
  const path = configPath();
  let revision = "missing";
  try {
    const stat = statSync(path);
    revision = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    /* Missing config has its own scope. */
  }
  return `${path}\n${settings.awsCliPath || "auto"}\n${revision}`;
}
export function fromMetadata(
  profile: SsoProfile,
  metadata: StatusMetadata | undefined,
  threshold: number,
  now = Date.now(),
): ProfileStatus {
  if (!metadata) return { profile, status: "Checking" };
  const success = ["Signed In", "Expiring Soon", "Expired"].includes(metadata.status);
  const stale =
    !metadata.checkedAt || now - Date.parse(metadata.checkedAt) > 120000 || (!success && !!metadata.lastSuccessAt);
  return {
    profile,
    status: success ? getStatusFromExpiration(metadata.expiration, threshold, now) : metadata.status,
    expiration: metadata.expiration,
    checkedAt: metadata.checkedAt,
    lastSuccessAt: metadata.lastSuccessAt,
    nextRetryAt: metadata.nextRetryAt,
    stale,
    failureKind: metadata.failureKind,
    message: metadata.failureKind ? cliErrorMessage(metadata.failureKind) : undefined,
  };
}
export function recordResult(result: ProfileStatus, previous?: StatusMetadata, now = Date.now()): StatusMetadata {
  const successfulCheck = isUsable(result) || result.status === "Expired";
  const failures = successfulCheck ? 0 : (previous?.failures || 0) + 1;
  return {
    status: result.status,
    expiration: result.expiration || (successfulCheck ? undefined : previous?.expiration),
    checkedAt: result.checkedAt,
    lastSuccessAt: successfulCheck ? result.checkedAt : previous?.lastSuccessAt,
    failures,
    nextRetryAt: now + (successfulCheck ? 60000 : result.status === "Not Signed In" ? 300000 : retryDelay(failures)),
    failureKind: result.failureKind,
  };
}
export function sessionAfterResult(
  previous: SessionMetadata,
  result: ProfileStatus,
  now = Date.now(),
): SessionMetadata {
  if (isUsable(result))
    return { ...previous, failures: 0, nextRetryAt: 0, needsLogin: false, recoverySeen: true, notified: false };
  if (result.failureKind === "login-required") return { ...previous, needsLogin: true, nextRetryAt: now + 300000 };
  if (result.failureKind === "network" || result.failureKind === "timeout") {
    const failures = previous.failures + 1;
    return { ...previous, failures, nextRetryAt: now + retryDelay(failures) };
  }
  return previous;
}
export interface RefreshOptions {
  force?: boolean;
  onlyProfile?: string;
  onlySession?: string;
  onSignOut?: (profile: SsoProfile) => Promise<void>;
}
export interface CoordinatorDependencies {
  findCli: (custom?: string) => Promise<string>;
  resolve: typeof resolveStatus;
}
export class StatusCoordinator {
  constructor(
    readonly store: MetadataStore,
    private readonly dependencies: CoordinatorDependencies = { findCli: requireAwsCli, resolve: resolveStatus },
  ) {}
  async refresh(settings: Settings, options: RefreshOptions = {}): Promise<Snapshot> {
    let profiles: SsoProfile[];
    try {
      profiles = filterProfiles(discoverProfiles(await readAwsConfig()), settings.profileFilter);
    } catch {
      return {
        profiles: [],
        error: "Invalid Configuration",
        notice: "AWS config is unreadable or invalid. Check its INI syntax and file permissions.",
      };
    }
    if (!profiles.length)
      return {
        profiles: [],
        notice:
          "No IAM Identity Center profiles found. Run aws configure sso in Terminal, or check your Profile Filter and AWS_CONFIG_FILE.",
      };
    const scope = scopeFor(settings);
    const threshold = Number(settings.threshold) || 30;
    const started = Date.now();
    const deadline = started + 24000;
    const results = new Map<string, ProfileStatus>();
    const grouped = new Map<string, SsoProfile[]>();
    for (const profile of profiles) {
      results.set(
        profile.name,
        fromMetadata(profile, await this.store.readStatus(profileKey(profile, scope)), threshold),
      );
      const key = sessionKey(profile, scope);
      grouped.set(key, [...(grouped.get(key) || []), profile]);
    }
    // Version detection is lazy: opening a recently checked menu performs no AWS subprocess at all.
    let executable: Promise<string> | undefined;
    const getCli = () => (executable ||= this.dependencies.findCli(settings.awsCliPath));
    const groups = [...grouped];
    let cursor = 0;
    const notices: SsoProfile[] = [];
    await Promise.all(
      Array.from({ length: Math.min(2, groups.length) }, async () => {
        while (cursor < groups.length) {
          const [key, members] = groups[cursor++];
          if (options.onlySession && key !== options.onlySession) continue;
          if (options.onlyProfile && !members.some((profile) => profile.name === options.onlyProfile)) continue;
          if (Date.now() >= deadline) {
            for (const profile of members)
              results.set(profile.name, {
                ...results.get(profile.name)!,
                stale: true,
                status: "Unknown",
                message: "Refresh time budget reached. Narrow the Profile Filter or refresh this profile individually.",
              });
            continue;
          }
          try {
            await this.store.withSessionLock(
              key,
              async () => {
                let session = await this.store.readSession(key);
                const processed = new Set<string>();
                for (const profile of members) {
                  if (options.onlyProfile && options.onlyProfile !== profile.name) continue;
                  const pKey = profileKey(profile, scope);
                  const previous = await this.store.readStatus(pKey);
                  const now = Date.now();
                  const cached = fromMetadata(profile, previous, threshold, now);
                  const checkedAt = previous?.checkedAt ? Date.parse(previous.checkedAt) : 0;
                  const afterLogin = checkedAt >= (session.lastLoginAt || 0);
                  // Explicit refresh bypasses backoff, but joins an operation completed since this request began.
                  const reusable =
                    previous && afterLogin && (checkedAt > started || (!options.force && previous.nextRetryAt > now));
                  if (profile.issues.length) {
                    results.set(profile.name, {
                      profile,
                      status: "Invalid Configuration",
                      message: profile.issues.join(" "),
                    });
                    continue;
                  }
                  if (reusable) {
                    results.set(profile.name, cached);
                    continue;
                  }
                  if (!options.force && session.nextRetryAt > now) {
                    results.set(profile.name, {
                      ...cached,
                      status: cached.status === "Not Signed In" ? "Not Signed In" : "Unknown",
                      stale: !!cached.lastSuccessAt,
                      nextRetryAt: session.nextRetryAt,
                      message: session.needsLogin
                        ? "Shared SSO session needs sign-in. This profile has not been rechecked."
                        : "AWS connection failed. Automatic checks will retry less frequently.",
                    });
                    continue;
                  }
                  if (Date.now() >= deadline) {
                    results.set(profile.name, {
                      ...cached,
                      stale: true,
                      status: "Unknown",
                      message:
                        "Refresh time budget reached. Narrow the Profile Filter or refresh this profile individually.",
                    });
                    continue;
                  }
                  let result: ProfileStatus;
                  try {
                    result = await this.dependencies.resolve(
                      profile,
                      await getCli(),
                      threshold,
                      Math.max(1, Math.min(8000, deadline - Date.now())),
                    );
                  } catch (error) {
                    const safe = error instanceof CliError ? error : new CliError("failed");
                    result = {
                      profile,
                      status: safe.kind === "missing" ? "AWS CLI Not Found" : "Unknown",
                      failureKind: safe.kind,
                      message: safe.message,
                      checkedAt: new Date().toISOString(),
                    };
                  }
                  processed.add(profile.name);
                  const saved = recordResult(result, previous);
                  await this.store.writeStatus(pKey, saved);
                  session = sessionAfterResult(session, result);
                  if (
                    settings.notifyOnSignOut &&
                    options.onSignOut &&
                    session.needsLogin &&
                    session.recoverySeen &&
                    !session.notified
                  ) {
                    session.notified = true;
                    notices.push(profile);
                  }
                  await this.store.writeSession(key, session);
                  results.set(profile.name, { ...fromMetadata(profile, saved, threshold), message: result.message });
                  // Once a shared token or network failure is known, don't retry it for every role even on manual refresh.
                  if (session.nextRetryAt > Date.now()) {
                    for (const sibling of members) {
                      if (processed.has(sibling.name) || (options.onlyProfile && sibling.name !== options.onlyProfile))
                        continue;
                      const prior = results.get(sibling.name)!;
                      results.set(sibling.name, {
                        ...prior,
                        status: profileKey(sibling, scope) === pKey ? result.status : "Unknown",
                        stale: !!prior.lastSuccessAt,
                        nextRetryAt: session.nextRetryAt,
                        message:
                          session.needsLogin && profileKey(sibling, scope) !== pKey
                            ? "Shared SSO session needs sign-in. This profile has not been rechecked."
                            : result.message,
                      });
                    }
                    break;
                  }
                }
              },
              Math.min(1000, Math.max(0, deadline - Date.now())),
            );
          } catch (error) {
            for (const profile of members)
              results.set(profile.name, {
                ...results.get(profile.name)!,
                status:
                  results.get(profile.name)?.status === "Checking" ? "Unknown" : results.get(profile.name)!.status,
                stale: true,
                message:
                  error instanceof OperationBusyError ? error.message : "Unable to check AWS status. Try refreshing.",
              });
          }
        }
      }),
    );
    if (options.onSignOut) for (const profile of notices) await options.onSignOut(profile).catch(() => undefined);
    return { profiles: profiles.map((profile) => results.get(profile.name)!) };
  }
}
