// ============================================================================
// CONSTANTS
// ============================================================================

// Time-related constants
export const TIME_DEFAULTS = {
  DEFAULT_TIME_INCREMENT: 15,
  DEFAULT_TIME_FORMAT: "0:15",
  DEFAULT_MINUTES: 15,
} as const;

// Toast message templates
export const TOAST_MESSAGES = {
  SUCCESS: {
    ENTRY_ADDED: "Entry Added",
    ENTRY_ADDED_DESCRIPTION: "Time entry has been added successfully",
    TIMER_STARTED: "Timer Started",
    TIMER_PAUSED: "Timer Paused",
    TIMER_DISCARDED: "Timer Discarded",
    TIMER_LOGGED: "Timer Logged",
  },
  ERROR: {
    FAILED_TO_ADD_ENTRY: "Failed to Add Entry",
    FAILED_TO_START_TIMER: "Failed to Start Timer",
    FAILED_TO_PAUSE_TIMER: "Failed to Pause Timer",
    FAILED_TO_DISCARD_TIMER: "Failed to Discard Timer",
    FAILED_TO_LOG_TIMER: "Failed to Log Timer",
    INVALID_INPUT: "Invalid Input",
    NETWORK_ERROR: "Network error",
    UNKNOWN_ERROR: "Unknown error",
  },
} as const;

// Form field hints and labels
export const FORM_MESSAGES = {
  PROJECT: {
    INFO: "Select the project for this time entry",
  },
  TIME: {
    INFO: "Enter time in h:mm format (e.g., 1:30) or minutes (e.g., 90)",
    PLACEHOLDER: "0:15 or 15",
  },
  DESCRIPTION: {
    INFO_TIMER: "Describe what you worked on during this timer session",
    INFO_MANUAL: "Describe the work you completed",
    PLACEHOLDER: "What did you work on?",
  },
  TAGS: {
    INFO: "Add tags to categorize this time entry",
  },
  DATE: {
    INFO: "Select the date for this time entry",
  },
} as const;

// UI component messages
export const UI_MESSAGES = {
  LOADING: {
    DEFAULT: "Loading...",
    SUBTITLE: "Please wait while we fetch your data",
  },
  ERROR: {
    TITLE: "Something went wrong",
    MESSAGE: "An unexpected error occurred. Please try again.",
    SUBTITLE: "Something went wrong. Please try again.",
  },
  ENTRIES: {
    ERROR_TITLE: "Error Loading Entries",
    ERROR_DESCRIPTION: "Failed to load entries. Please try again.",
  },
} as const;

// Timer state priorities for sorting (lower number = higher priority)
export const TIMER_STATE_PRIORITIES = {
  RUNNING: 1,
  PAUSED: 2,
  NULL: 3,
} as const;
