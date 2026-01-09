export interface ErrorResult {
  success: false;
  error: string;
}

export function handleTelegramError(error: unknown): ErrorResult {
  if (error instanceof Error && error.message.includes("FloodWaitError")) {
    const match = error.message.match(/(\d+) seconds/);
    const seconds = match ? match[1] : "unknown";
    return {
      success: false,
      error: `Rate limited by Telegram. Please wait ${seconds} seconds before trying again.`,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error occurred",
  };
}
