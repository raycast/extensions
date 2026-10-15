declare module "swift:../../swift" {
  export function createCalendarEvent(payloadBase64: string): Promise<string>;
  export function createReminder(payloadBase64: string): Promise<string>;
  export function listWritableCalendarsJSON(): Promise<string>;
  export function listWritableReminderListsJSON(): Promise<string>;
}
