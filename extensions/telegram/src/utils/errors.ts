export function handleTelegramError(error: unknown): never {
  if (error instanceof Error && error.message.includes("FloodWaitError")) {
    const match = error.message.match(/(\d+) seconds/);
    const seconds = match ? match[1] : "unknown";
    throw new Error(`Rate limited by Telegram. Please wait ${seconds} seconds before trying again.`);
  }

  throw error instanceof Error ? error : new Error("Unknown error occurred");
}
