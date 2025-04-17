// Storage keys
export const SAVED_COMMANDS_KEY = "n8nSavedWebhookCommands";
export const TRIGGER_FILTERS_KEY = "n8nTriggerWorkflowFilters"; // Added new key
// Using LocalStorage for trigger filters because it can handle complex objects more easily than Preferences API, providing flexibility for potential future filter enhancements.

// API paths
export const WORKFLOWS_API_PATH = "/api/v1/workflows";
export const WEBHOOKS_API_PATH = "/api/v1/webhooks";
export const TAGS_API_PATH = "/api/v1/tags";

// UI texts
export const INVALID_CREDENTIALS_MESSAGE = "Please check your API credentials in extension preferences";
export const FILTER_APPLIED_INDICATOR = " (Filtered)";
export const DETAIL_VIEW_KEY = "n8nDetailViewPreference";
