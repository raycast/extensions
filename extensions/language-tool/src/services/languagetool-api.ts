import { getPreferenceValues } from "@raycast/api";
import { API_ENDPOINTS } from "../config/api";
import type { CheckTextResponse } from "../types";
import { isEmpty } from "../utils/string-utils";

export type CheckTextOptions = {
  /** The text to be checked (required if 'data' is not provided) */
  text?: string;
  /** JSON with markup (alternative to 'text') */
  data?: string;
  /** Language code (e.g., 'en-US', 'pt-BR', 'auto') */
  language: string;
  /** Comma-separated list of dictionaries to include */
  dicts?: string;
  /** Native language code for false friends detection */
  motherTongue?: string;
  /** Preferred variants when using language=auto (e.g., 'en-GB,de-AT') */
  preferredVariants?: string;
  /** Rule IDs to be enabled, comma-separated */
  enabledRules?: string;
  /** Rule IDs to be disabled, comma-separated */
  disabledRules?: string;
  /** Category IDs to be enabled, comma-separated */
  enabledCategories?: string;
  /** Category IDs to be disabled, comma-separated */
  disabledCategories?: string;
  /** If true, only rules/categories specified in enabledRules/enabledCategories are activated */
  enabledOnly?: boolean;
  /** Check level: '' (default), 'default', or 'picky' (more strict) */
  level?: "" | "default" | "picky";
  /** If true, enables hidden rules in the API */
  enableHiddenRules?: boolean;
  /** Languages that should not be processed (comma-separated) */
  noopLanguages?: string;
  /** A/B test configuration for experimental features */
  abtest?: string;
  /** API mode: '', 'allButTextLevelOnly', or 'textLevelOnly' */
  mode?: "" | "allButTextLevelOnly" | "textLevelOnly";
  /** If true, allows incomplete results */
  allowIncompleteResults?: boolean;
  /** User agent for API requests */
  useragent?: string;
};

/**
 * Centralized service for LanguageTool API calls
 * Automatically includes Premium credentials if configured in preferences
 */
export async function checkTextWithAPI(
  options: CheckTextOptions,
): Promise<CheckTextResponse> {
  const preferences = getPreferenceValues<Preferences>();

  // Build base parameters
  const params: Record<string, string> = {
    language: options.language,
  };

  // Text or data (one of them is required)
  if (options.text && !isEmpty(options.text)) {
    params.text = options.text;
  } else if (options.data) {
    params.data = options.data;
  }

  // Add Premium credentials if they exist
  if (preferences.username && preferences.apiKey) {
    params.username = preferences.username;
    params.apiKey = preferences.apiKey;
  }

  // Add all advanced options if provided
  if (options.dicts && !isEmpty(options.dicts)) {
    params.dicts = options.dicts;
  }
  if (options.motherTongue && !isEmpty(options.motherTongue)) {
    params.motherTongue = options.motherTongue;
  }
  if (options.preferredVariants && !isEmpty(options.preferredVariants)) {
    params.preferredVariants = options.preferredVariants;
  }
  if (options.enabledRules && !isEmpty(options.enabledRules)) {
    params.enabledRules = options.enabledRules;
  }
  if (options.disabledRules && !isEmpty(options.disabledRules)) {
    params.disabledRules = options.disabledRules;
  }
  if (options.enabledCategories && !isEmpty(options.enabledCategories)) {
    params.enabledCategories = options.enabledCategories;
  }
  if (options.disabledCategories && !isEmpty(options.disabledCategories)) {
    params.disabledCategories = options.disabledCategories;
  }
  if (options.enabledOnly !== undefined) {
    params.enabledOnly = String(options.enabledOnly);
  }
  if (options.level && !isEmpty(options.level)) {
    params.level = options.level;
  }
  if (options.enableHiddenRules !== undefined) {
    params.enableHiddenRules = String(options.enableHiddenRules);
  }
  if (options.noopLanguages && !isEmpty(options.noopLanguages)) {
    params.noopLanguages = options.noopLanguages;
  }
  if (options.abtest && !isEmpty(options.abtest)) {
    params.abtest = options.abtest;
  }
  if (options.mode && !isEmpty(options.mode)) {
    params.mode = options.mode;
  }
  if (options.allowIncompleteResults !== undefined) {
    params.allowIncompleteResults = String(options.allowIncompleteResults);
  }
  if (options.useragent && !isEmpty(options.useragent)) {
    params.useragent = options.useragent;
  }

  const formData = new URLSearchParams(params);

  const response = await fetch(API_ENDPOINTS.CHECK, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Check if user has Premium credentials configured
 */
export function hasPremiumAccess(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return !!(preferences.username && preferences.apiKey);
}
