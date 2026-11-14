import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/**
 * The Graphite CLI keeps its auth token and host settings in `user_config`. The official menu bar app reads the
 * same file, so we mirror the CLI's resolution rules here.
 */
const profileSchema = z.object({
  name: z.string(),
  hostPrefix: z.string().optional(),
  baseHostname: z.string().optional(),
  authToken: z.string().optional(),
});

const userConfigSchema = z.looseObject({
  authToken: z.string().optional(),
  alternativeProfiles: z.array(profileSchema).optional(),
});

export type GraphiteConfig = {
  authToken: string | undefined;
  apiUrl: string;
  appUrl: string;
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

function configDir(configHome?: string): string {
  return join(configHome ?? process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "graphite");
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

/**
 * @param configHome Overrides `XDG_CONFIG_HOME`, e.g. with the value from the user's login shell, which Raycast
 * doesn't inherit.
 */
export async function readGraphiteConfig(configHome?: string): Promise<GraphiteConfig> {
  const raw = await readFirstExisting([
    join(configDir(configHome), "user_config"),
    join(homedir(), ".graphite_user_config"),
  ]);
  if (raw === undefined) {
    throw new GraphiteConfigMissingError();
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new GraphiteConfigInvalidError(
      "The Graphite CLI config isn't valid JSON. Run `gt auth --token <token>` to rewrite it.",
    );
  }
  const parsed = userConfigSchema.safeParse(body);
  if (!parsed.success) {
    throw new GraphiteConfigInvalidError(
      "The Graphite CLI config has an unexpected format. Run `gt auth --token <token>` to rewrite it.",
    );
  }
  const config = parsed.data;
  // Like the CLI without GRAPHITE_PROFILE set: a profile called "default" wins over the top-level fields.
  const profile = config.alternativeProfiles?.find((p) => p.name === "default");

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
    authToken: profile?.authToken ?? config.authToken,
    apiUrl,
    appUrl,
  };
}
