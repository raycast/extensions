import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/**
 * Finds the Graphite CLI's token and hosts the same way `gt` does (https://graphite.com/docs/configure-cli):
 * - Profile: `GRAPHITE_PROFILE`, then the `profile` field in `user_config`, then a profile named "default".
 * - Token: `GRAPHITE_AUTH_TOKEN`, then the `auth` file for that profile (gt 1.8.4+), then `user_config`.
 */
const profileSchema = z.object({
  name: z.string(),
  hostPrefix: z.string().optional(),
  baseHostname: z.string().optional(),
  authToken: z.string().optional(),
});

const configFileSchema = z.looseObject({
  authToken: z.string().optional(),
  profile: z.string().optional(),
  alternativeProfiles: z.array(profileSchema).optional(),
});

type ConfigFile = z.infer<typeof configFileSchema>;

export type GraphiteConfig = {
  authToken: string | undefined;
  apiUrl: string;
  appUrl: string;
};

export type GraphiteEnvironment = {
  /** Overrides `XDG_CONFIG_HOME`, e.g. with the value from the user's login shell, which Raycast doesn't inherit. */
  XDG_CONFIG_HOME?: string;
  GRAPHITE_AUTH_TOKEN?: string;
  GRAPHITE_PROFILE?: string;
};

export class GraphiteConfigMissingError extends Error {
  constructor() {
    super("Graphite CLI is not set up on this Mac. Install it and run `gt auth`.");
    this.name = "GraphiteConfigMissingError";
  }
}

export class GraphiteConfigInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphiteConfigInvalidError";
  }
}

async function readFirstExisting(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    try {
      return await readFile(path, "utf8");
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

function parseUserConfig(raw: string): ConfigFile {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new GraphiteConfigInvalidError(
      "The Graphite CLI config isn't valid JSON. Run `gt auth --token <token>` to rewrite it.",
    );
  }
  const parsed = configFileSchema.safeParse(body);
  if (!parsed.success) {
    throw new GraphiteConfigInvalidError(
      "The Graphite CLI config has an unexpected format. Run `gt auth --token <token>` to rewrite it.",
    );
  }
  return parsed.data;
}

/** Like `gt`, an unreadable `auth` file falls back to `user_config` instead of failing. */
function parseAuthFile(raw: string | undefined): ConfigFile | undefined {
  if (raw === undefined) return undefined;
  try {
    const parsed = configFileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** A profile's own token wins; the top-level token belongs to the default profile. */
function tokenFor(file: ConfigFile | undefined, profileName: string | undefined): string | undefined {
  if (!file) return undefined;
  const profileToken = profileName
    ? file.alternativeProfiles?.find((profile) => profile.name === profileName)?.authToken
    : undefined;
  return profileToken || file.authToken || undefined;
}

export async function readGraphiteConfig(env: GraphiteEnvironment = process.env): Promise<GraphiteConfig> {
  const directory = join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "graphite");
  const [userConfigRaw, authRaw] = await Promise.all([
    readFirstExisting([join(directory, "user_config"), join(homedir(), ".graphite_user_config")]),
    readFirstExisting([join(directory, "auth")]),
  ]);
  const envToken = env.GRAPHITE_AUTH_TOKEN?.trim() || undefined;
  if (userConfigRaw === undefined && authRaw === undefined && !envToken) {
    throw new GraphiteConfigMissingError();
  }

  const userConfig = userConfigRaw === undefined ? {} : parseUserConfig(userConfigRaw);
  const auth = parseAuthFile(authRaw);

  const chosenProfile = env.GRAPHITE_PROFILE?.trim() || userConfig.profile;
  const profileName =
    chosenProfile ?? (userConfig.alternativeProfiles?.some((p) => p.name === "default") ? "default" : undefined);
  const profile = profileName ? userConfig.alternativeProfiles?.find((p) => p.name === profileName) : undefined;
  const authHasProfile = auth?.alternativeProfiles?.some((p) => p.name === chosenProfile);
  if (chosenProfile && chosenProfile !== "default" && !profile && !authHasProfile) {
    throw new GraphiteConfigInvalidError(
      `The Graphite profile "${chosenProfile}" isn't set up. Check GRAPHITE_PROFILE or run \`gt config\`.`,
    );
  }

  const apiUrl = profile?.baseHostname
    ? `https://api.${profile.baseHostname}/v1`
    : profile?.hostPrefix
      ? `https://api.${profile.hostPrefix}.graphite.com/v1`
      : "https://api.graphite.com/v1";
  const appUrl = profile?.baseHostname
    ? `https://app.${profile.baseHostname}`
    : profile?.hostPrefix
      ? `https://app.${profile.hostPrefix}.graphite.com`
      : "https://app.graphite.com";

  return {
    authToken: envToken ?? tokenFor(auth, profileName) ?? tokenFor(userConfig, profileName),
    apiUrl,
    appUrl,
  };
}
