/**
 * One BusyCal app installation that the extension can target.
 */
export interface BusyCalInstallation {
  bundleId: string;
  appPath: string;
  displayName: string;
}

/**
 * One calendar or task list returned by BusyCal automation.
 */
export interface BusyCalCalendar {
  accountID: string;
  calendarID: string;
  isSubscribed: boolean;
  supportsEvents: boolean;
  supportsTasks: boolean;
  title: string;
}

/**
 * BusyCal item kinds that the extension can receive through automation.
 */
export type BusyCalItemType =
  | "event"
  | "task"
  | "journal"
  | "graphic"
  | "sticky";

/**
 * One BusyCal item normalized for Raycast list rendering and reveal actions.
 */
export interface BusyCalItem {
  id: string;
  title: string;
  type: BusyCalItemType;
  calendarID: string;
  /**
   * Canonical display and sort date normalized from BusyCal's raw item fields.
   */
  primaryDate?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  location?: string;
  seriesUID: string;
  occurrenceDate?: string;
  occurrenceSeconds?: number;
  isFloating: boolean;
}

/**
 * Shared filter parameters accepted by BusyCal item query commands.
 */
export interface BusyCalItemQuery {
  searchText?: string;
  startDate?: string;
  endDate?: string;
  itemTypes?: BusyCalItemType[];
  fetchLimit?: number;
}

/**
 * One availability slot returned by BusyCal.
 */
export interface BusyCalNextAvailableResult {
  startDate: string;
  endDate: string;
  timeZoneIdentifier?: string;
}

/**
 * Input passed to BusyCal's availability automation command.
 */
export interface BusyCalNextAvailableQuery {
  startDate?: string;
  endDate?: string;
  calendarIDs?: string[];
  minimumDurationMinutes: number;
  respectWorkingHours: boolean;
}

/**
 * Form state for structured event creation.
 */
export interface EventFormValues {
  title: string;
  calendarID?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string;
  notes: string;
}

/**
 * Form state for structured task creation.
 */
export interface TaskFormValues {
  title: string;
  calendarID?: string;
  hasDueDate: boolean;
  dueDate: Date;
  notes: string;
}

/**
 * Normalized payload used by BusyCal's structured event automation command.
 */
export interface BusyCalEventInput {
  title: string;
  startDate: string;
  endDate: string;
  calendarID?: string;
  allDay: boolean;
  location?: string;
  notes?: string;
}

/**
 * Normalized payload used by BusyCal's structured task automation command.
 */
export interface BusyCalTaskInput {
  title: string;
  dueDate?: string;
  calendarID?: string;
  notes?: string;
}

/**
 * Normalized payload used by BusyCal's natural-language quick-add automation command.
 */
export interface BusyCalNaturalLanguageItemInput {
  text: string;
  itemType: "event" | "task" | "journal";
  calendarID?: string;
  notes?: string;
}
