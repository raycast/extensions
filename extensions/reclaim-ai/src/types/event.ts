export enum ReclaimEventTypeEnum {
  USER = "USER",
  SYNC = "SYNC",
  HABITASSIGNMENT = "HABIT_ASSIGNMENT",
  SMARTHABIT = "SMART_HABIT",
  ONEONONEASSIGNMENT = "ONE_ON_ONE_ASSIGNMENT",
  SMARTMEETING = "SMART_MEETING",
  TASKASSIGNMENT = "TASK_ASSIGNMENT",
  CONFBUFFER = "CONF_BUFFER",
  TRAVELBUFFER = "TRAVEL_BUFFER",
  SCHEDULINGLINKMEETING = "SCHEDULING_LINK_MEETING",
  UNKNOWN = "UNKNOWN",
}

export enum EventResponseStatusEnum {
  None = "None",
  Organizer = "Organizer",
  Accepted = "Accepted",
  Declined = "Declined",
  TentativelyAccepted = "TentativelyAccepted",
  NotResponded = "NotResponded",
}

export type EventResponseStatusType = `${EventResponseStatusEnum}`;

export type ReclaimEventType = `${ReclaimEventTypeEnum}`;

export enum AssistType {
  TASK = "TASK",
  CUSTOMDAILY = "CUSTOM_DAILY",
  CATCHUPAM = "CATCHUP_AM",
  CATCHUPPM = "CATCHUP_PM",
  LUNCH = "LUNCH",
  FOCUS = "FOCUS",
  TRAVELPRE = "TRAVEL_PRE",
  TRAVELPOST = "TRAVEL_POST",
  CONBUF = "CONBUF",
}

export enum AssistStatus {
  CONTROLLED = "CONTROLLED",
  RELEASED = "RELEASED",
  ARCHIVED = "ARCHIVED",
}

export enum LockState {
  MANUALLYLOCKED = "MANUALLY_LOCKED",
  ADJUSTED = "ADJUSTED",
  UPCOMINGWINDOW = "UPCOMING_WINDOW",
  MANUALLYUNLOCKED = "MANUALLY_UNLOCKED",
  DELETED = "DELETED",
  DECLINED = "DECLINED",
  INTHEPAST = "IN_THE_PAST",
}

export interface AssistPolicyOverride {
  windowStart: string;
  idealTime: string;
  windowEnd: string;
  durationMin: number;
  durationMax: number;
  forceDefend: boolean;
}

export enum RecurringAssignmentType {
  ONEONONE = "ONE_ON_ONE",
  DAILYHABIT = "DAILY_HABIT",
  TASK = "TASK",
}

export interface AssistDetails {
  type?: AssistType;
  customHabit?: boolean;
  smartSeries?: boolean;
  habitOrTask?: boolean;
  task?: boolean;
  conferenceBuffer?: boolean;
  status?: AssistStatus;

  /** The source event id for a travel assist event. */
  travelNewEventId?: string | null;

  /** The source event id for a conference (decompression time) event. */
  conferenceEventId?: string | null;
  lastControlledUpdate?: string;
  lastControlledHash?: number;
  defended?: boolean;
  pinned?: boolean;
  lockState?: LockState | null;
  dailyHabitId?: number | null;
  seriesLineageId?: number | null;
  seriesId?: number | null;
  taskId?: number | null;
  taskIndex?: number | null;
  policyOverride?: AssistPolicyOverride | null;
  lastManualAdjustment?: string;
  recurringAssignmentType?: RecurringAssignmentType;
  eventType?: ReclaimEventType;
  manuallyStarted?: boolean;
  assistReferenceValid?: boolean;
}

export interface Event {
  allocatedTimeChunks: number;
  assist?: AssistDetails;
  sourceDetails?: {
    calendarId: number;
    eventId: string;
    etag: string;
    writable: boolean;
    eventKey: string;
    base64Id: string;
    url: string;
    title: string;
  };
  calendarId: number;
  category: string;
  color:
    | "NONE"
    | "LAVENDER"
    | "SAGE"
    | "GRAPE"
    | "FLAMINGO"
    | "BANANA"
    | "TANGERINE"
    | "PEACOCK"
    | "GRAPHITE"
    | "BLUEBERRY"
    | "BASIL"
    | "TOMATO";
  conferenceCall: boolean;
  etag: string;
  eventEnd: string;
  eventId: string;
  eventStart: string;
  free: boolean;
  key: string;
  numAttendees: number;
  onlineMeetingUrl: string;
  organizer: string;
  personalSync: boolean;
  private: boolean;
  public: boolean;
  published: boolean;
  reclaimEventType: string;
  reclaimManaged: boolean;
  recurringEventId?: string;
  recurring: boolean;
  recurringException: boolean;
  recurringInstance: boolean;
  requiresTravel: boolean;
  rsvpStatus: EventResponseStatusType;
  scoredType: string;
  status: string;
  subType: string;
  timeChunks: number;
  title: string;
  titleSeenByOthers: string;
  type: string;
  underAssistControl: boolean;
  updated: string;
  version: string;
}

export enum EventColor {
  NONE = "NONE",
  LAVENDER = "LAVENDER",
  SAGE = "SAGE",
  GRAPE = "GRAPE",
  FLAMINGO = "FLAMINGO",
  BANANA = "BANANA",
  TANGERINE = "TANGERINE",
  PEACOCK = "PEACOCK",
  GRAPHITE = "GRAPHITE",
  BLUEBERRY = "BLUEBERRY",
  BASIL = "BASIL",
  TOMATO = "TOMATO",
}
