export interface ExtensionCalendarConfigurationItem {
  /** Whether the calendar is disabled (not used in the extension). */
  disabled: boolean;
}

export interface ExtensionConfig {
  /** Configuration for each calendar, by its ID. */
  calendarConfiguration: Record<string, ExtensionCalendarConfigurationItem>;
}

export const DefaultConfig: ExtensionConfig = {
  calendarConfiguration: {},
};
