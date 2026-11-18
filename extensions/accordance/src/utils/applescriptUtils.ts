// Escape a string for safe interpolation into a double-quoted AppleScript string
export const escapeForAppleScript = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

// Generate safe AppleScript for Accordance verse retrieval
export const generateAccordanceAppleScript = (module: string, reference: string): string => {
  const escapedModule = escapeForAppleScript(module);
  const escapedReference = escapeForAppleScript(reference);

  return `
    try
      tell application "Accordance"
        if not running then launch
        set verseText to «event AccdTxRf» {"${escapedModule}", "${escapedReference}", true}
        return verseText
      end tell
    on error errorMessage number errorNumber
      return "Error: [" & errorNumber & "] " & errorMessage
    end try
  `.trim();
};
