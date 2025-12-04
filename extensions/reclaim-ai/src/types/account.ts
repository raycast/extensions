export interface CalendarAccount {
  id: number;
  name: string;
  valid: boolean;
  avatar: string;
  main: boolean;
  primaryCalendarId?: number;
  canDelete: boolean;
  type: string;
  identityAccess: boolean;
  calendarAccess: "WRITE" | "READ";
  taskAccess: boolean;
  unique: boolean;
  lastSynced: string;
  switchToMainURI?: string;
  repairURI: unknown;
  connectedCalendars: Array<{
    name: string;
    id: number;
    externalId: string;
    connected: boolean;
    colorHex: string;
    credentialId: number;
    writableFor: Array<string>;
    reason?: string;
  }>;
  numSyncedCalendars: number;
  userName: string;
  firstName: string;
  lastName: string;
  scopes: string;
}
