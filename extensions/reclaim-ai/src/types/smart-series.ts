import { EventColor } from "./event";

export enum SmartSeriesType {
  HABIT = "HABIT",
  MEETING = "MEETING",
}

export enum SmartSeriesStatus {
  NEW = "NEW",
  ACTIVE = "ACTIVE",
  ACTIVETIMEPOLICYEMPTY = "ACTIVE_TIME_POLICY_EMPTY",
  ACTIVETIMEPOLICYLOW = "ACTIVE_TIME_POLICY_LOW",
  ACTIVEEVERYONEDECLINED = "ACTIVE_EVERYONE_DECLINED",
  ACTIVEEVERYREQUIREDDECLINED = "ACTIVE_EVERY_REQUIRED_DECLINED",
  DISABLED = "DISABLED",
  INACTIVECALENDARNOTVALID = "INACTIVE_CALENDAR_NOT_VALID",
  INACTIVECALENDARNOTCONNECTED = "INACTIVE_CALENDAR_NOT_CONNECTED",
  INACTIVECALENDARNOTWRITABLE = "INACTIVE_CALENDAR_NOT_WRITABLE",
  INACTIVEMULTICONNECTEDCALENDAR = "INACTIVE_MULTI_CONNECTED_CALENDAR",
  INACTIVECALENDARNOTFOUND = "INACTIVE_CALENDAR_NOT_FOUND",
  INACTIVEORGANIZERMISSING = "INACTIVE_ORGANIZER_MISSING",
  EVERYONEDECLINED = "EVERYONE_DECLINED",
  EVERYREQUIREDDECLINED = "EVERY_REQUIRED_DECLINED",
  CORRUPTED = "CORRUPTED",
  UNKNOWN = "UNKNOWN",
  NOACCESS = "NO_ACCESS",
}

export enum SmartSeriesEventType {
  FOCUS = "FOCUS",
  SOLOWORK = "SOLO_WORK",
  PERSONAL = "PERSONAL",
  TEAMMEETING = "TEAM_MEETING",
  EXTERNALMEETING = "EXTERNAL_MEETING",
  ONEONONE = "ONE_ON_ONE",
}

export interface SmartSeriesView {
  id?: number;
  eventId?: string;
  title?: string;
  starting?: string;
  ending?: string | null;
  idealTime?: string;
  durationMinMins?: number;
  durationMaxMins?: number;
  eventType?: SmartSeriesEventType;
  alwaysPrivate?: boolean;
  color?: EventColor;
  description?: string | null;
  defendedDescription?: string | null;
  autoDecline?: boolean;
  autoDeclineText?: string | null;
  googleMeet?: boolean;
  location?: string;
  reservedWords?: string[];
  dependencyRef?: number | null;
  fixedTimePolicy?: boolean;
  rescheduleUnstartedOverride?: boolean | null;
  // not included for simplicity
  // attendees?: SmartSeriesAttendeeView[];
  // resources?: SmartSeriesResourceView[];
  // recurrence?: RecurrenceDefinition;
  // defenseAggression?: DefenseAggression;
  // conferenceDetails?: ConferenceDetails | null;
  // dependencyType?: SmartSeriesDependencyType | null;
  // failurePolicy?: SmartSeriesBookingFailurePolicy;
  // timezone?: ZoneId | null;
}

export type SmartSeriesLineageView<T extends SmartSeriesType> = {
  lineageId: number;
  calendarId?: number;
  type?: T;
  status?: SmartSeriesStatus;
  activeSeries?: SmartSeriesView;
  series?: SmartSeriesView[];
  enabled?: boolean;
  restorable?: boolean;
  // not included for simplicity
  // periods?: SmartSeriesPeriodView[];
};

export type SmartHabit = SmartSeriesLineageView<SmartSeriesType.HABIT>;
