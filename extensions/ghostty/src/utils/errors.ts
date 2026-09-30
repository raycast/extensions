export function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function getAppleScriptErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (message.includes('Can\'t get application "Ghostty"')) {
    return "Ghostty isn't installed or can't be found by macOS.";
  }

  if (message.includes("AppleScript is disabled")) {
    return "Ghostty AppleScript support is disabled. Enable `macos-applescript = true` in your Ghostty config.";
  }

  return message;
}
