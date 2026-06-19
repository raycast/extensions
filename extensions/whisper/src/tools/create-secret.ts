import { createSecret, parseDuration } from "../shared";

type Input = {
  /**
   * The secret text to share (password, API key, note, etc.)
   */
  secret: string;
  /**
   * How long the secret link should stay alive. Use a duration string like "30m", "1h", "24h", or "7d". Defaults to "1h".
   */
  duration?: string;
  /**
   * Whether the secret should be deleted after the first view. Defaults to true.
   */
  selfDestruct?: boolean;
};

export default async function tool(input: Input) {
  if (!input.secret?.trim()) {
    throw new Error("Secret cannot be empty.");
  }

  try {
    const durationSeconds = (input.duration ? parseDuration(input.duration) : null) ?? 3600;
    const selfDestruct = input.selfDestruct ?? true;
    const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;

    const shareUrl = await createSecret(input.secret, expirationTimestamp, selfDestruct);
    return shareUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create secret link.";
    throw new Error(message);
  }
}
