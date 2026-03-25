export function handleTelegramError(error: unknown): never {
  if (error instanceof Error) {
    const msg = error.message;

    if (msg.includes("FloodWaitError") || msg.includes("FLOOD_WAIT")) {
      const match = msg.match(/(\d+) seconds/);
      const seconds = match ? match[1] : "unknown";
      throw new Error(`Rate limited by Telegram. Please wait ${seconds} seconds before trying again.`);
    }

    if (msg.includes("PHONE_CODE_EXPIRED")) {
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (msg.includes("PHONE_CODE_INVALID")) {
      throw new Error("Invalid verification code. Please check the code and try again.");
    }

    if (msg.includes("SESSION_PASSWORD_NEEDED")) {
      throw new Error("Two-factor authentication is required. Please enter your 2FA password.");
    }

    if (msg.includes("PASSWORD_HASH_INVALID")) {
      throw new Error("Invalid 2FA password. Please check your Telegram two-factor authentication password.");
    }

    if (msg.includes("API_ID_INVALID")) {
      throw new Error("Invalid API ID. Please check your credentials in the extension preferences.");
    }

    if (msg.includes("PHONE_NUMBER_INVALID")) {
      throw new Error("Invalid phone number format. Please use the international format (e.g., +1234567890).");
    }
  }

  throw error instanceof Error ? error : new Error("Unknown error occurred");
}
