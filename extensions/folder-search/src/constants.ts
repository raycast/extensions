/**
 * Default values for application preferences and state
 */
export const DEFAULT_PREFERENCES = {
  searchScope: "",
  isShowingDetail: undefined, // Let the preference system handle this default
  showNonCloudLibraryPaths: false,
} as const;

/**
 * Type for preference defaults
 */
export type PreferenceDefaults = typeof DEFAULT_PREFERENCES;
