import { useCachedPromise } from "@raycast/utils";
import { listBusyCalCalendars } from "./busycal-automation";
import { resolveBusyCalInstallation } from "./busycal-installation";
import { BusyCalCalendar, BusyCalInstallation } from "./types";

type SupportedCalendarKind = "event" | "task";

/**
 * Resolves the BusyCal installation through Raycast's cached async hook.
 *
 * The cached value keeps the extension responsive on subsequent opens while
 * still allowing commands to revalidate when the installed app state changes.
 */
export function useBusyCalInstallation() {
  return useCachedPromise(resolveBusyCalInstallation, [], {
    keepPreviousData: true,
    onError: () => {},
  });
}

/**
 * Loads BusyCal calendars filtered to the capability a command needs.
 *
 * - Parameters:
 *   - installation: The resolved BusyCal installation, when available.
 *   - supportedKind: Whether the caller needs event-capable calendars or task lists.
 * - Returns: Raycast cached-promise state for the filtered calendar list.
 */
export function useBusyCalCalendars(
  installation: BusyCalInstallation | undefined,
  supportedKind: SupportedCalendarKind,
) {
  return useCachedPromise(
    async (
      activeInstallation: BusyCalInstallation | undefined,
      activeSupportedKind: SupportedCalendarKind,
    ) => {
      if (!activeInstallation) {
        return [];
      }

      const calendars = await listBusyCalCalendars(activeInstallation);
      return calendars.filter((calendar) =>
        activeSupportedKind === "event"
          ? calendar.supportsEvents
          : calendar.supportsTasks,
      );
    },
    [installation, supportedKind],
    {
      execute: Boolean(installation),
      initialData: [] as BusyCalCalendar[],
      keepPreviousData: true,
      onError: () => {},
    },
  );
}
