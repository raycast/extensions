export const KEEPER_COMMANDER_CLI_COMMANDS = {
  GENERATE_PASSWORD: "generate -nb --format=json",
  LIST_ALL_RECORDS: "list --format=json",
  GET_RECORD_BY_ID: (recordId: string) => `get ${recordId} --format=json`,
  SYNC_RECORDS: "sync-down",
  ONE_TIME_SHARE_RECORD: (recordId: string) => `share create ${recordId} -e 7d`,
  GET_TWO_FACTOR_CODE: (recordId: string) => `totp ${recordId} --range 1`,
  GET_SERVER_URL: "server",
} as const;

export const ERROR_MESSAGES = {
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. 10 requests per minute. Please wait a moment and try again.",
  AUTHENTICATION_FAILED: "Authentication failed. Please check your API key.",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later.",
  SOMETHING_WENT_WRONG: "Something went wrong",
  TITLE_GENERATE_PASSWORD_UNSECELECTED_OPTIONS: "At least one option must be selected",
  MESSAGE_GENERATE_PASSWORD_UNSECELECTED_OPTIONS: "Symbols, Digits, Uppercase, and Lowercase letters are all options",
  GENERATE_PASSWORD_FAILED: "Failed to generate password",
  GENERATE_PASSPHRASE_FAILED: "Failed to generate passphrase",
  PASSWORD_LENGTH_REQUIRED: "Password length is required",
  PASSWORD_LENGTH_MUST_BE_A_NUMBER: "Password length must be a number greater than 20 and less than 100",
  COPIED_TO_CLIPBOARD: "Failed to copy to clipboard!",
  SYNC_RECORDS: "Failed to sync records",
  FETCH_RECORD_DETAILS: "Failed to fetch record details",
  FETCH_RECORDS_TITLE: "Failed to fetch records",
  ONE_TIME_SHARE_RECORD: "Failed to generate one time share link",
  COPY_TWO_FACTOR_CODE: "Failed to copy two factor code",
  NO_VALUE_TO_COPY: "No value found to copy",
  TOTP_NOT_FOUND: "This record does not contain TOTP codes",
  UNABLE_TO_EXTRACT_TWO_FACTOR_CODE: "Unable to extract two-factor code from the response",
  OPEN_RECORD_IN_BROWSER: "Failed to open record in browser",
  FETCH_SERVER_URL: "Failed to fetch server URL",
} as const;

export const SUCCESS_MESSAGES = {
  COPIED_TO_CLIPBOARD: "Copied to clipboard!",
  PASSWORD_COPIED: "Password copied to clipboard!",
  PASSPHRASE_COPIED: "Passphrase copied to clipboard!",
  SYNC_RECORDS_SUCCESS: "Records synced successfully!",
  FETCH_RECORDS_TITLE: "Records fetched successfully!",
  ONE_TIME_SHARE_RECORD_SUCCESS: "One Time Share Link copied to clipboard!",
  TWO_FACTOR_CODE_COPIED: "Two Factor Code copied to clipboard!",
  OPENED_IN_BROWSER: "Record opened in browser!",
} as const;

export const IN_PROGRESS_MESSAGES = {
  FETCHING_RECORDS_TITLE: "Fetching Records...",
  GENERATING_PASSWORD_TITLE: "Generating Password...",
  PLEASE_WAIT_A_MOMENT: "Please wait a moment",
  GENERATING_PASSPHRASE_TITLE: "Generating Passphrase...",
  FETCHING_RECORD_DETAILS_TITLE: "Fetching Record Details...",
  SYNCING_RECORDS_TITLE: "Syncing Records...",
  ONE_TIME_SHARE_RECORD_TITLE: "Generating One Time Share Link...",
  FETCHING_TWO_FACTOR_CODE_TITLE: "Fetching Two Factor Code...",
  OPENING_RECORD_IN_BROWSER_TITLE: "Opening Record in Browser...",
} as const;

export const ACTION_TITLES = {
  COPY_PASSWORD: "Copy Password",
  COPY_PASSPHRASE: "Copy Passphrase",
  GENERATE_PASSWORD: "Generate Password",
  GENERATE_PASSPHRASE: "Generate Passphrase",
} as const;

export const API_ERROR_MESSAGES = {
  // Client Errors (4xx)
  BAD_REQUEST: "Invalid request format. Please check your input and try again.",
  UNAUTHORIZED: "Authentication failed. Please check your API key and ensure you're logged in.",
  FORBIDDEN: "Access denied. Your IP may not be allowed or the command is not permitted.",
  NOT_FOUND: "Requested resource not found. The record or command may not exist.",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please wait a moment before trying again.",

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR:
    "Keeper service encountered an internal error or unable to connect to Keeper service. Please check your internet connection and try again.",
  SERVICE_UNAVAILABLE: "Keeper service is temporarily unavailable. Please try again in a few moments.",

  // Network/Connection errors
  NETWORK_ERROR: "Unable to connect to Keeper service. Please check your internet connection.",
  CONNECTION_TIMEOUT: "Connection timed out. The Keeper service may be slow to respond.",
  DNS_ERROR: "Cannot resolve the Keeper service address. Please check your API URL.",

  // Authentication errors
  INVALID_API_KEY: "Invalid API key. Please check your extension preferences.",
  EXPIRED_API_KEY: "API key has expired. Please generate a new one.",
  INSUFFICIENT_PERMISSIONS: "Your API key doesn't have the required permissions.",

  // Validation errors
  INVALID_PASSWORD_LENGTH: "Password length must be between 8 and 128 characters.",
  INVALID_OPTIONS: "Please select at least one character type for password generation.",

  // Generic fallbacks
  UNEXPECTED_ERROR: "An unexpected error occurred. Please try again.",
  UNKNOWN_ERROR: "Something went wrong. Please check your setup and try again.",
} as const;

export const RECORD_RESPONSE_FIELDS = {
  LOGIN: "login",
  PASSWORD: "password",
} as const;

export const FEATURE_REQUEST_URL =
  "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2Cenhancement&template=extension_feature_request.yml&title=%5BKeeper%20Security%5D+...";

export const BUG_REPORT_URL =
  "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2Cbug&template=extension_bug_report.yml&title=%5BKeeper%20Security%5D+...";
