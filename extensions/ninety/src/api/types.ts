// Types mirror the Ninety Public API v1 Swagger schemas (https://api.public.ninety.io/v1/swagger).
// Ninety is inconsistent about `id` vs `_id`; api/ninety.ts fills in both on every item it returns.

export interface Team {
  _id: string;
  name: string;
}

export interface AvailableTeam extends Team {
  isMember: boolean;
}

export type UserRole = "owner" | "admin" | "manager" | "managee" | "observer" | "lite";

export interface User {
  id: string;
  primaryEmail?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  teamIds: string[];
  active?: boolean;
}

export interface Comment {
  userId?: string;
  text?: string;
  createdDate?: string;
  editedDate?: string;
}

export interface Paginated<T> {
  items: T[];
  totalCount: number;
}

// To-Dos

export interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  isPersonal: boolean;
  completed: boolean;
  archived: boolean;
  teamId?: string;
  teamName?: string;
  userId: string;
  companyId: string;
  createdDate: string;
  updatedDate: string;
  comments?: Comment[];
}

export type LinkedItemType = "todo" | "rock" | "issue" | "milestone";

export interface TodosQuery {
  teamId?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  isPersonal?: boolean;
  completed?: boolean;
  archived?: boolean;
  searchText?: string;
  userIds?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string;
  teamId?: string;
  linkedItemId?: string;
  linkedItemType?: "rock" | "issue" | "milestone";
}

export interface UpdateTodoInput {
  completed?: boolean;
  archived?: boolean;
  dueDate?: string;
  teamId?: string;
  title?: string;
  description?: string;
}

// Issues

export type IssueInterval = "SHORT_TERM" | "LONG_TERM";

export interface Issue {
  id: string;
  userId?: string;
  teamId?: string;
  companyId?: string;
  archived?: boolean;
  completed?: boolean;
  completedDate?: string;
  createdBy?: string;
  deleted?: boolean;
  description?: string;
  intervalCode?: IssueInterval;
  /** 0-5, 5 is highest. 0 means unset. */
  priority?: number;
  title?: string;
  createdDate?: string;
  comments?: Comment[];
}

export interface IssuesQuery {
  teamId?: string;
  intervalCode?: IssueInterval;
  searchText?: string;
  sortField?: string;
  sortDirection?: "ASC" | "DESC";
  pageSize?: number;
  pageIndex?: number;
}

export interface CreateIssueInput {
  title: string;
  teamId: string;
  interval?: IssueInterval;
  description?: string;
  priority?: number;
  linkedItemId?: string;
  linkedItemType?: "todo" | "rock" | "milestone";
}

export interface UpdateIssueInput {
  title?: string;
  teamId?: string;
  interval?: IssueInterval;
  description?: string;
  priority?: number;
  completed?: boolean;
}

// Rocks & Milestones

export type RockStatus = "OFF_TRACK" | "ON_TRACK" | "DONE" | "CANCELED" | "DRAFT";
export type RockLevel = "USER" | "COMPANY_AND_DEPARTMENT" | "COMPANY" | "DEPARTMENT";
export type RockQuarter = "Q1" | "Q2" | "Q3" | "Q4" | "None";
export type RockFutureScope = "Current" | "Next" | "Later" | "Future";

export interface Milestone {
  _id: string;
  companyId: string;
  rockId: string;
  teamId: string;
  ownedByUserId: string;
  title: string;
  description?: string;
  dueDate: string;
  isDone: boolean;
  isDeleted: boolean;
  completedDate?: string;
  createdDate: string;
}

export interface Rock {
  _id: string;
  userId: string;
  teamId: string;
  companyId: string;
  title: string;
  description?: string;
  archived: boolean;
  deleted: boolean;
  completed: boolean;
  dueDate: string;
  statusCode: RockStatus;
  levelCode: RockLevel;
  quarter: RockQuarter;
  futureScope?: RockFutureScope;
  createdDate?: string;
  completedDate?: string;
  dueDateQuarter?: string;
  additionalTeamIds?: string[];
  milestones?: Milestone[];
}

export interface RocksQuery {
  teamId?: string;
  userId?: string;
  statusCode?: RockStatus;
  levelCode?: RockLevel;
  futureScope?: RockFutureScope | "all";
  archived?: boolean;
  searchText?: string;
  sortField?: "title" | "statusCode" | "dueDate" | "completedDate" | "owner" | "team" | "dueDateQuarter";
  sortDirection?: "ASC" | "DESC";
  pageSize?: number;
  pageIndex?: number;
}

export interface CreateRockInput {
  teamId: string;
  title: string;
  dueDate: string;
  statusCode: RockStatus;
  levelCode: RockLevel;
  quarter: RockQuarter;
  description?: string;
}

export interface UpdateRockInput {
  title?: string;
  description?: string;
  statusCode?: RockStatus;
  levelCode?: RockLevel;
  dueDate?: string;
  archived?: boolean;
}

export interface CreateMilestoneInput {
  rockId: string;
  teamId: string;
  title: string;
  dueDate: string;
  description?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  dueDate?: string;
  isDone?: boolean;
  completedDate?: string;
}

// Headlines

export interface Headline {
  id: string;
  teamId: string;
  companyId?: string;
  title: string;
  description?: string;
  userId?: string;
  createdByUserId?: string;
  createdDate?: string;
  completed: boolean;
  archived: boolean;
  isCascadedMessage: boolean;
  cascadedFromTeamId?: string;
}

export interface HeadlinesQuery {
  teamId: string;
  isCascadedMessage?: boolean;
  includeDiscussed?: boolean;
  archived?: boolean;
  searchText?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateHeadlineInput {
  title: string;
  teamId: string;
  description?: string;
  isCascadedMessage?: boolean;
}

// Scorecard

export type PeriodInterval = "weekly" | "monthly" | "quarterly" | "annual";
export type KpiUnit = "number" | "percentage" | "yesno" | "time" | "dollar" | "euro" | "pound";

export interface ScorecardPeriod {
  label: string;
  periodStartDate: string;
  isFuture: boolean;
  partialInterval?: boolean;
}

export interface ScorecardScore extends ScorecardPeriod {
  /** null when no score has been entered. */
  value?: unknown;
  goal?: unknown;
  note?: unknown;
}

export interface ScorecardKpi {
  id: string;
  title: string;
  unit: KpiUnit;
  currency?: "USD" | "AUD" | "CAD" | "EUR" | "GBP";
  ownerName?: string;
  defaultGoal?: unknown;
  average?: unknown;
  total?: unknown;
  scores: ScorecardScore[];
}

export interface ScorecardGroup {
  id: string;
  name: string;
  kpis: ScorecardKpi[];
}

export interface TeamScorecard {
  id: string;
  name: string;
  periodInterval: PeriodInterval;
  teamId: string;
  periods: ScorecardPeriod[];
  groups: ScorecardGroup[];
}

// Meetings

export type MeetingType =
  | "level10"
  | "quarterly"
  | "annualDayOne"
  | "annualDayTwo"
  | "focusDay"
  | "visionBuildingDayOne"
  | "visionBuildingDayTwo"
  | "weeklyOneOnOne"
  | "custom"
  | "other";

export interface MeetingPerson {
  id: string;
  primaryEmail?: string;
  firstName?: string;
  lastName?: string;
}

export interface MeetingAgendaItem {
  name: string;
  durationSeconds: number;
  ordinal: number;
}

export interface NextMeeting {
  scheduleId: string;
  teamId: string;
  teamName?: string;
  meetingType: MeetingType;
  cadence: "none" | "weekly" | "biWeekly" | "monthly";
  scheduledDate: string;
  agendaId?: string;
  agendaName?: string;
  presenter?: MeetingPerson;
  scribe?: MeetingPerson;
  agenda: MeetingAgendaItem[];
  attendees: MeetingPerson[];
}

export interface MeetingRating {
  userId: string;
  rating: number;
}

/** A concluded Meeting, as listed by `GET /meetings`. */
export interface PastMeeting {
  id: string;
  teamId: string;
  date: string;
  endDate?: string;
  meetingType: MeetingType;
  /** Custom agenda name; most Meetings have none. */
  name?: string;
  /** 0 means the duration was never recorded. */
  durationSeconds: number;
  averageRating?: number;
  ratings?: MeetingRating[];
  /** People on the roster, not confirmed attendance. */
  attendeeCount?: number;
  issuesTracked?: number;
  issuesSolved?: number;
  issueSolveRatePercent?: number;
  issueSolveRateTargetPercent?: number;
  presenterId?: string;
  agendaId?: string;
}

export interface MeetingItemRef {
  id: string;
  title?: string;
  ownerId?: string;
}

/** One concluded Meeting in full, from `GET /meetings/{id}`. */
export interface PastMeetingDetail extends PastMeeting {
  /** HTML. The only free-text record of what was decided. */
  notes?: string;
  presenter?: MeetingPerson;
  attendees?: MeetingPerson[];
  doneHeadlines?: MeetingItemRef[];
  cascadingMessages?: MeetingItemRef[];
  workedIssues?: MeetingItemRef[];
  newTodos?: MeetingItemRef[];
  newRocks?: MeetingItemRef[];
}
