function getErrorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const details = error as { message?: string; errorMessage?: string };
  return `${details.errorMessage || ""} ${details.message || ""}`.trim();
}

function formatFloodWaitMessage(errorText: string): string | null {
  const floodWaitMatch = errorText.match(/FLOOD_WAIT_(\d+)/);
  if (floodWaitMatch?.[1]) {
    const totalSeconds = parseInt(floodWaitMatch[1], 10);
    if (Number.isNaN(totalSeconds)) return null;

    if (totalSeconds < 60) {
      return `Rate limited by Telegram. Try again in ${totalSeconds} second${totalSeconds === 1 ? "" : "s"}.`;
    }

    const minutes = Math.ceil(totalSeconds / 60);
    return `Rate limited by Telegram. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  const secondsMatch = errorText.match(/(\d+)\s+seconds?/i);
  if (secondsMatch?.[1]) {
    return `Rate limited by Telegram. Try again in ${secondsMatch[1]} seconds.`;
  }

  return null;
}

export function getTelegramErrorMessage(error: unknown): string {
  const errorText = getErrorText(error).toUpperCase();

  if (errorText.includes("SESSION_PASSWORD_NEEDED")) {
    return "This account has 2-Step Verification enabled. Please enter your password to continue.";
  }

  if (errorText.includes("PASSWORD_HASH_INVALID")) {
    return "Incorrect 2-Step Verification password. Please try again.";
  }

  if (errorText.includes("PHONE_CODE_INVALID")) {
    return "The verification code is invalid. Please check the code and try again.";
  }

  if (errorText.includes("PHONE_CODE_EXPIRED")) {
    return "The verification code has expired. Request a new code and try again.";
  }

  const floodWaitMessage = formatFloodWaitMessage(errorText);
  if (floodWaitMessage) {
    return floodWaitMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error occurred";
}

export function handleTelegramError(error: unknown): never {
  throw new Error(getTelegramErrorMessage(error));
}
