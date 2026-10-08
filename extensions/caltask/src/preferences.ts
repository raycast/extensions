import { getPreferenceValues, LocalStorage, AI } from "@raycast/api";
import { getCalendarsWithColors } from "./calendar";
import { CalendarInfo } from "./types";

// ── LocalStorage keys ──────────────────────────────────────────
const VISIBLE_CALENDARS_KEY = "visible-calendars";
const DEFAULT_CALENDAR_ID_KEY = "default-calendar-id";

// ── Static preference accessors ────────────────────────────────

/**
 * Get the configured AI model for natural language parsing.
 * Returns the AI.Model enum value corresponding to the preference.
 * Falls back to Claude 4.5 Haiku if the preference value is
 * not a recognized AI.Model key.
 */
export function getPreferredAIModel(): AI.Model {
  const prefs = getPreferenceValues<Preferences>();
  const modelValue = prefs.aiModel || "anthropic-claude-4-5-haiku";

  const modelMap: Record<string, AI.Model> = {
    "anthropic-claude-4-5-haiku": AI.Model["Anthropic_Claude_4.5_Haiku"],
    "anthropic-claude-sonnet-4": AI.Model["Anthropic_Claude_4_Sonnet"],
    "anthropic-claude-sonnet-4-5": AI.Model["Anthropic_Claude_4.5_Sonnet"],
    "anthropic-claude-opus-4": AI.Model["Anthropic_Claude_4_Opus"],
    "openai-gpt-4o": AI.Model["OpenAI_GPT-4o"],
    "openai-gpt-4o-mini": AI.Model["OpenAI_GPT-4o_mini"],
    "openai-gpt-4.1": AI.Model["OpenAI_GPT-4.1"],
    "openai-gpt-4.1-mini": AI.Model["OpenAI_GPT-4.1_mini"],
    "google-gemini-2.5-flash": AI.Model["Google_Gemini_2.5_Flash"],
    "google-gemini-2.5-pro": AI.Model["Google_Gemini_2.5_Pro"],
    "perplexity-sonar": AI.Model["Perplexity_Sonar"],
  };

  return modelMap[modelValue] || AI.Model["Anthropic_Claude_4.5_Haiku"];
}

/** Number of days ahead to show in Upcoming section. */
export function getUpcomingDays(): number {
  const prefs = getPreferenceValues<Preferences>();
  const val = parseInt(prefs.upcomingDays, 10);
  return isNaN(val) || val < 1 ? 7 : val;
}

/** Number of days back to show in Recent History. */
export function getRecentHistoryDays(): number {
  const prefs = getPreferenceValues<Preferences>();
  const val = parseInt(prefs.recentHistoryDays, 10);
  return isNaN(val) || val < 1 ? 30 : val;
}

/** Default event duration in milliseconds. */
export function getDefaultEventDurationMs(): number {
  const prefs = getPreferenceValues<Preferences>();
  const minutes = parseInt(prefs.defaultEventDuration, 10);
  const validMinutes = isNaN(minutes) || minutes < 1 ? 60 : minutes;
  return validMinutes * 60 * 1000;
}

// ── Dynamic calendar preferences (LocalStorage) ───────────────

/**
 * Get the list of visible calendar IDs from LocalStorage.
 * Returns null if no filter is set (meaning all are visible).
 */
export async function getVisibleCalendarIds(): Promise<string[] | null> {
  const raw = await LocalStorage.getItem<string>(VISIBLE_CALENDARS_KEY);
  if (!raw) return null;
  try {
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : null;
  } catch {
    return null;
  }
}

/**
 * Save the list of visible calendar IDs to LocalStorage.
 * Pass null to clear the filter (show all calendars).
 */
export async function setVisibleCalendarIds(ids: string[] | null): Promise<void> {
  if (ids === null) {
    await LocalStorage.removeItem(VISIBLE_CALENDARS_KEY);
  } else {
    await LocalStorage.setItem(VISIBLE_CALENDARS_KEY, JSON.stringify(ids));
  }
}

/**
 * Fetch all calendars, then filter to only those marked visible.
 * If no visibility filter is set, returns all calendars.
 */
export async function getVisibleCalendars(): Promise<CalendarInfo[]> {
  const allCalendars = await getCalendarsWithColors();
  const visibleIds = await getVisibleCalendarIds();

  if (visibleIds === null) {
    return allCalendars;
  }

  const filtered = allCalendars.filter((c) => visibleIds.includes(c.id));
  // If filter resulted in nothing (e.g., calendars deleted),
  // fall back to all calendars
  return filtered.length > 0 ? filtered : allCalendars;
}

/**
 * Get the default calendar ID from LocalStorage.
 * Returns null if no default is set.
 */
export async function getDefaultCalendarId(): Promise<string | null> {
  const raw = await LocalStorage.getItem<string>(DEFAULT_CALENDAR_ID_KEY);
  return raw || null;
}

/**
 * Set the default calendar ID in LocalStorage.
 * Pass null to clear the default.
 */
export async function setDefaultCalendarId(id: string | null): Promise<void> {
  if (id === null) {
    await LocalStorage.removeItem(DEFAULT_CALENDAR_ID_KEY);
  } else {
    await LocalStorage.setItem(DEFAULT_CALENDAR_ID_KEY, id);
  }
}

/**
 * Resolve the initial calendar ID for forms:
 * 1. Use the default calendar if set and exists in the list
 * 2. Otherwise fall back to the first calendar in the list
 * Returns undefined if no calendars available.
 */
export async function resolveDefaultCalendarId(calendars: CalendarInfo[]): Promise<string | undefined> {
  if (calendars.length === 0) return undefined;

  const defaultId = await getDefaultCalendarId();
  if (defaultId && calendars.some((c) => c.id === defaultId)) {
    return defaultId;
  }
  return calendars[0].id;
}
