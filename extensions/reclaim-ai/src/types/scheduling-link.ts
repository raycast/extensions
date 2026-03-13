export interface SchedulingLink {
  id: string;
  title: string;
  slug: string;
  pageSlug: string;
  description: string;
  enabled: boolean;
  hidden: boolean;
  mainOrganizerId: string;
  organizers: Organizer[];
  effectiveTimePolicy: EffectiveTimePolicy;
  durations: number[];
  delayStart: string;
  delayStartUnits: number;
  daysIntoFuture: number;
  priority: string;
  locationOptions: LocationOption[];
  defaultLocationIndex: number;
  iconType: string;
  organizerRefCode: string;
  meetingTitle: string;
  linkGroupId: string;
  linkGroupName: string;
  targetCalendarId: number;
  permissions: Permissions;
}

export interface Organizer {
  organizer: UserOrganizer;
  role: string;
  timezone: Timezone;
  timePolicyType: string;
  resolvedTimePolicy: ResolvedTimePolicy;
  status: string;
}

export interface UserOrganizer {
  userId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

export interface Timezone {
  id: string;
  displayName: string;
  abbreviation: string;
}

export interface ResolvedTimePolicy {
  dayHours: DayHours;
  startOfWeek: string;
  endOfWeek: string;
}

export interface DayHours {
  FRIDAY: Friday;
  MONDAY: Monday;
  TUESDAY: Tuesday;
  THURSDAY: Thursday;
  WEDNESDAY: Wednesday;
}

export interface Friday {
  intervals: Interval[];
  endOfDay: string;
}

export interface Interval {
  start: string;
  end: string;
  duration: number;
}

export interface Monday {
  intervals: Interval[];
  endOfDay: string;
}

export interface Tuesday {
  intervals: Interval[];
  endOfDay: string;
}

export interface Thursday {
  intervals: Interval[];
  endOfDay: string;
}

export interface Wednesday {
  intervals: Interval[];
  endOfDay: string;
}

export interface EffectiveTimePolicy {
  dayHours: DayHours;
  startOfWeek: string;
  endOfWeek: string;
}

export interface LocationOption {
  conferenceType: string;
}

export interface Permissions {
  canEdit: boolean;
  canEnable: boolean;
  canDelete: boolean;
}

export interface SchedulingLinkGroup {
  id: string;
  name: string;
  slug: string;
  linkIds: string[];
  main: boolean;
}
