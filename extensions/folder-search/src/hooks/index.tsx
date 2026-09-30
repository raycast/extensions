/**
 * Central export file for all hooks in the Folder Search extension
 * This allows importing any hook directly from the /hooks directory
 * Example: import { useFolderSearch } from "./hooks";
 */

// Main hooks
export { useFolderSearch } from "./useFolderSearch";

// Pin management hooks
export { usePinManagement } from "./usePinManagement";
export { usePinStorage } from "./usePinStorage";

// Search-related hooks
export { useSearchResults } from "./useSearchResults";

// Plugin management hooks
export { usePluginManagement } from "./usePluginManagement";

// Preference management hooks
export { usePreferences } from "./usePreferences";
