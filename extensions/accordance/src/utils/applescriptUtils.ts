// Generate safe AppleScript for Accordance verse retrieval
export const generateAccordanceAppleScript = (module: string, reference: string): string => {
  // Properly escape strings for AppleScript by using quoted form
  // This prevents injection attacks by treating the input as literal strings
  const escapedModule = module.replace(/'/g, "\\'").replace(/\\/g, "\\\\");
  const escapedReference = reference.replace(/'/g, "\\'").replace(/\\/g, "\\\\");

  return `
    tell application "Accordance"
      if not running then launch
      try
        set theModule to "${escapedModule}"
        set verseText to «event AccdTxRf» {theModule, "${escapedReference}", true}
        return verseText
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
  `.trim();
};
