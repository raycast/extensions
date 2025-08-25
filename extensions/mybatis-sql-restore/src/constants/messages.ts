export const MESSAGES = {
  SUCCESS: {
    SQL_FORMATTED: "✅ SQL formatted",
    SQL_COPIED: "✅ SQL copied to clipboard",
  },
  ERROR: {
    NO_CLIPBOARD_TEXT: "No text content in clipboard",
    NO_VALID_SQL: "No valid SQL statement found",
    INVALID_MYBATIS_LOG: "Please ensure clipboard contains complete Mybatis log",
    GENERAL_ERROR: "An error occurred",
    EMPTY_INPUT: "Please enter SQL statement",
  },
  ACTIONS: {
    COPY_TO_CLIPBOARD: "Copy to Clipboard",
    BACK: "Back to Input Form",
    FORMAT_SQL: "Format SQL",
    RESTORE_FROM_CLIPBOARD: "Restore from Clipboard",
    VIEW_FORMATTED: "View Formatted SQL",
    COPY_FORMATTED: "Copy Formatted SQL",
  },
  TITLES: {
    FORMATTED_SQL: "Formatted SQL",
    MYBATIS_SQL_LOG: "Mybatis SQL Log",
    FORMAT_RESULT: "Format Result",
    SQL_INPUT: "SQL Statement",
  },
  PLACEHOLDERS: {
    MYBATIS_LOG: "Please paste Mybatis log...",
    SQL_INPUT: "Please enter SQL statement to format...",
  },
  HUD: {
    COPIED: "Copied to clipboard",
  },
} as const;
