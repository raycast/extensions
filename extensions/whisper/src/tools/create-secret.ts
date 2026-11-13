import { createSecret, getDefaults, parseDuration } from "../shared";

type Input = {
  /**
   * The secret text to share (password, API key, note, etc.)
   */
  secret: string;
  /**
   * How long the secret link should stay alive. Use a duration string like "30m", "1h", "24h", or "7d". Defaults to the user's preference (1h unless changed).
   */
  duration?: string;
  /**
   * Whether the secret should be deleted after the first view. Defaults to the user's preference (true unless changed).
   */
  selfDestruct?: boolean;
};

export default async function tool(input: Input) {
  if (!input.secret?.trim()) {
    throw new Error("Secret cannot be empty.");
  }

  try {
    const defaults = getDefaults();
    const durationSeconds = (input.duration ? parseDuration(input.duration) : null) ?? defaults.durationSeconds;
    const selfDestruct = input.selfDestruct ?? defaults.selfDestruct;
    const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;

    const shareUrl = await createSecret(input.secret, expirationTimestamp, selfDestruct);
    return shareUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create secret link.";
    throw new Error(message);
  }
}
