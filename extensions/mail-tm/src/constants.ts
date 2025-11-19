export const API = "https://api.mail.tm";
export const EXPIRATION_DAYS = 1;

export const HTTP_STATUS = {
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
} as const;

export const HTTP_HEADERS = {
  CONTENT_TYPE_JSON: "application/json",
  CONTENT_TYPE_MERGE_PATCH: "application/merge-patch+json",
  AUTHORIZATION_BEARER_PREFIX: "Bearer",
} as const;

export const TIME = {
  MILLISECONDS_IN_SECOND: 1000,
  MILLISECONDS_IN_HOUR: 1000 * 60 * 60,
  MILLISECONDS_IN_DAY: 1000 * 60 * 60 * 24,
  HOUR_THRESHOLD: 1,
  DAY_THRESHOLD: 24,
  TWO_DAY_THRESHOLD: 48,
} as const;

export const STORAGE_KEYS = {
  TEMP_EMAILS: "temp-emails",
} as const;

export const API_RESPONSE = {
  HYDRA_MEMBER: "hydra:member",
} as const;

export const ERROR_MESSAGES = {
  RATE_LIMIT: "Too many requests. Please try again later.",
  ACCOUNT_CREATE_FAILED: "Failed to create account",
  TOKEN_FAILED: "Failed to get authentication token",
  ACCOUNT_DELETE_FAILED: "Failed to delete account from API",
  MESSAGES_FETCH_FAILED: "Failed to fetch messages",
  MESSAGE_DETAILS_FAILED: "Failed to fetch message details",
  DOMAINS_FETCH_FAILED: "Failed to fetch domains",
  EMAIL_DELETE_FAILED: "Failed to delete",
  MESSAGES_LOAD_FAILED: "Failed to load messages",
  MESSAGE_LOAD_FAILED: "Failed to load message",
  EMAIL_GENERATE_FAILED: "Failed to generate email",
  STANDARD_ERROR_MESSAGE: "Unexpected error occurred",
} as const;

export const TOAST_MESSAGES = {
  GENERATING: "Generating...",
  DONE: "Done!",
  EMAIL_DELETED: "Email deleted",
  DELETING: "Deleting...",
} as const;

export const UI_STRINGS = {
  // Confirmation dialogs
  DELETE_EMAIL_TITLE: "Delete Email",
  DELETE_EMAIL_MESSAGE: (email: string) => `Are you sure you want to delete ${email}?`,

  // Empty states
  NO_SAVED_EMAILS_TITLE: "No saved emails",
  NO_SAVED_EMAILS_DESCRIPTION: "Generate a temporary email to get started",
  NO_MESSAGES_TITLE: "No messages",
  NO_MESSAGES_DESCRIPTION: "Your mailbox is empty",

  // Action buttons
  VIEW_MAILBOX: "View Mailbox",
  REFRESH: "Refresh",
  DELETE_EMAIL: "Delete Email",
  COPY_EMAIL: "Copy Email",
  COPY_PASSWORD: "Copy Password",
  VIEW_MESSAGE: "View Message",
  COPY_FULL_EMAIL_CONTENT: "Copy Full Email Content",
  COPY_SENDER_EMAIL: "Copy Sender Email",

  // Main menu
  QUICK_GENERATE_TITLE: "Quick Generate",
  QUICK_GENERATE_DESCRIPTION: "Generate a random temporary email instantly",
  GENERATE: "Generate",
  VISIT_MAIL_TM: "Visit Mail.tm",
  CUSTOMIZE_EMAIL_TITLE: "Customize Email",
  CUSTOMIZE_EMAIL_DESCRIPTION: "Create an email with custom address and password",
  CUSTOMIZE: "Customize",
  VIEW_SAVED_EMAILS_TITLE: "View Saved Emails",
  VIEW_SAVED_EMAILS_DESCRIPTION: "Manage your temporary emails",
  VIEW: "View",

  // Form labels
  CUSTOMIZE_FORM_DESCRIPTION: "Customize your temporary email. Leave fields empty to generate random values.",
  EMAIL_ADDRESS_LABEL: "Email Address",
  EMAIL_ADDRESS_PLACEHOLDER: "Leave empty for random (e.g., happy-blue-cat)",
  EMAIL_ADDRESS_HELPER: "Enter only the local part (before @)",
  PASSWORD_LABEL: "Password",
  PASSWORD_PLACEHOLDER: "Leave empty for random password",
  PASSWORD_HELPER:
    "You can leave the password empty, this will only be used by the extension to access the email via the API.",
  DOMAIN_LABEL: "Domain",

  // Toast messages (additional)
  PASSWORD_COPIED_TITLE: "Password copied",
  PASSWORD_COPIED_MESSAGE: "Sensitive information copied to clipboard",

  // Section titles
  COPY_SECTION_TITLE: "Copy",

  // Confirmation actions
  DELETE_ACTION: "Delete",

  // Message metadata labels
  METADATA_FROM: "From",
  METADATA_EMAIL: "Email",
  METADATA_TO: "To",
  METADATA_DATE: "Date",
  METADATA_ATTACHMENTS: "Attachments",
  METADATA_FILES: (count: number) => `${count} file(s)`,

  // Content placeholders
  NO_CONTENT: "No content",
  NO_SUBJECT: "(No Subject)",

  // Date formatting
  EXPIRES_IN_HOURS: (hours: number) => `Expires in ${hours}h`,
  EXPIRES_TODAY: "Expires today",
  EXPIRES_TOMORROW: "Expires tomorrow",
  EXPIRES_IN_DAYS: (days: number) => `Expires in ${days} days`,
  MINUTES_AGO: (minutes: number) => `${minutes}m ago`,
  HOURS_AGO: (hours: number) => `${hours}h ago`,
  YESTERDAY: "Yesterday",

  // Tooltips
  UNREAD_TOOLTIP: "Unread",

  // Domain display
  DOMAIN_PREFIX: "Domain: ",
} as const;

// URLs
export const URLS = {
  MAIL_TM: "https://mail.tm",
} as const;

export const HTML_CONVERTER_CONFIG = {
  HEADING_STYLE: "atx" as const,
  CODE_BLOCK_STYLE: "fenced" as const,
  TAGS_TO_REMOVE: ["style", "script", "noscript", "iframe"] as string[],
} as const;
