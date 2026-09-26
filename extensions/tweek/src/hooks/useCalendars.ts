import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  ExtensionPreferences,
  TweekCalendar,
  TweekCustomColor,
} from "../types";
import { list_calendars, list_colors } from "../utils/tweek-client";
import {
  getCachedCalendars,
  getCachedColors,
  setCachedCalendars,
  setCachedColors,
} from "./useTaskCache";

export function resolveDefaultCalendar(
  calendars: TweekCalendar[],
  preferredNameOrId?: string,
): TweekCalendar | undefined {
  if (calendars.length === 0) return undefined;

  if (preferredNameOrId && preferredNameOrId.trim()) {
    const query = preferredNameOrId.trim().toLowerCase();
    const match = calendars.find(
      (c) => c.id.toLowerCase() === query || c.name.toLowerCase() === query,
    );
    if (match) return match;
  }

  const defaultCal = calendars.find((c) => c.isDefault);
  return defaultCal || calendars[0];
}

export function useCalendars(initialCalendarId?: string) {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  const [calendars, setCalendars] = useState<TweekCalendar[]>(() => {
    return getCachedCalendars(true) || [];
  });
  const [customColors, setCustomColors] = useState<TweekCustomColor[]>(() => {
    return getCachedColors(true) || [];
  });
  const [activeCalendarId, setActiveCalendarId] = useState<string>(() => {
    if (initialCalendarId) return initialCalendarId;
    const cached = getCachedCalendars(true);
    if (cached && cached.length > 0) {
      const def = resolveDefaultCalendar(cached, prefs.defaultCalendar);
      return def ? def.id : cached[0].id;
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState<boolean>(calendars.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const loadCalendarsAndColors = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh) {
        const freshCals = getCachedCalendars(false);
        const freshCols = getCachedColors(false);
        if (freshCals && freshCals.length > 0) {
          setCalendars(freshCals);
          if (freshCols) setCustomColors(freshCols);
          if (!activeCalendarId) {
            const def = resolveDefaultCalendar(
              freshCals,
              prefs.defaultCalendar,
            );
            if (def) setActiveCalendarId(def.id);
          }
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const [fetchedCalendars, fetchedColors] = await Promise.all([
          list_calendars(),
          list_colors(),
        ]);

        setCalendars(fetchedCalendars);
        setCustomColors(fetchedColors);
        setCachedCalendars(fetchedCalendars);
        setCachedColors(fetchedColors);
        setIsOffline(false);

        if (
          fetchedCalendars.length > 0 &&
          (!activeCalendarId ||
            !fetchedCalendars.some((c) => c.id === activeCalendarId))
        ) {
          const def = resolveDefaultCalendar(
            fetchedCalendars,
            prefs.defaultCalendar,
          );
          if (def) {
            setActiveCalendarId(def.id);
          }
        }
      } catch (err) {
        const staleCalendars = getCachedCalendars(true);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Tweek calendars.";

        if (staleCalendars && staleCalendars.length > 0) {
          setCalendars(staleCalendars);
          setIsOffline(true);
          await showToast({
            style: Toast.Style.Failure,
            title: "Using Offline Cache",
            message: "Could not reach Tweek. Showing cached calendars.",
          });
        } else {
          setError(message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Tweek Connection Error",
            message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeCalendarId, prefs.defaultCalendar],
  );

  useEffect(() => {
    void loadCalendarsAndColors(false);
  }, []);

  const activeCalendar =
    calendars.find((c) => c.id === activeCalendarId) || calendars[0];

  return {
    calendars,
    customColors,
    activeCalendarId: activeCalendar?.id || activeCalendarId,
    setActiveCalendarId,
    activeCalendar,
    isLoading,
    error,
    isOffline,
    refreshCalendars: () => loadCalendarsAndColors(true),
  };
}
