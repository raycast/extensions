export type Priority = "no_priority" | "low" | "medium" | "high" | "urgent";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: Priority;
  dueDate: string | null;
  assignees: string[];
  createdBy: string;
  estimatedTime: number | null;
  timeLogged: number | null;
  linkedMeetingIds: string[];
  fileCount: number;
  linkedRecordCount: number;
  timerState: {
    provider: "timely";
    eventId: string;
    startedAt: string;
  } | null;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  authUserId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type ActivityItem = {
  id: string;
  action: string;
  comment: string | null;
  actor: Profile | null;
  createdAt: string;
};

export type TaskFile = {
  id: string;
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  displaySize: "small" | "medium" | "full";
  url: string | null;
  source: "direct" | "comment" | "description" | "activity";
  uploadedByProfile: Profile | null;
  createdAt: number;
};

export type TaskDetail = Task & {
  assigneeProfiles: Profile[];
  createdByProfile: Profile | null;
  linkedRecords: Array<{
    recordId: string;
    title: string;
    avatarUrl: string | null;
    objectTypeId: string;
    objectTypeName: string;
    objectTypeSlug?: string;
    objectTypeIcon?: string;
    objectTypeColor?: string;
  }>;
  linkedMeetings: ScheduleItem[];
  section: {
    id: string | null;
    name: string | null;
    color: string | null;
    recordId: string;
    recordTitle: string;
  } | null;
  activity: ActivityItem[];
  comments: ActivityItem[];
  files: TaskFile[];
};

export type TaskUpdateInput = {
  title?: string;
  description?: string;
  status?: string;
  priority?: Priority;
  dueDate?: string | null;
  assignees?: string[];
  estimatedTime?: number | null;
  linkedRecordIds?: string[];
  linkedMeetingIds?: string[];
  sectionId?: string | null;
};

export type TaskStatus = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  position: number;
  isComplete: boolean;
  isDefault: boolean;
};

export type ScheduleItem = {
  id: string;
  source: "meeting" | "calendar_event";
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  status: string;
  detailLevel: "full" | "title_time" | "busy";
  location: string | null;
  description: string | null;
  joinUrl: string | null;
  externalUrl?: string | null;
  calendarName?: string;
  webUrl: string;
  linkedMeetingId: string | null;
};

type SearchBase = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  webUrl: string;
};

export type TaskSearchResult = SearchBase & {
  kind: "task";
  task: Pick<Task, "status" | "priority" | "dueDate">;
};

export type RecordSearchResult = SearchBase & {
  kind: "record";
  avatarUrl?: string | null;
  record: {
    objectTypeSlug: string;
    objectTypeName: string;
    icon: string | null;
    color: string | null;
    meta: Array<{
      label: string;
      value: string;
      type?: string;
      slug?: string;
    }>;
  };
};

export type ObjectTypeOption = {
  id: string;
  name: string;
  singularName: string;
  pluralName: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
};

export type MeetingSearchResult = SearchBase & {
  kind: "meeting";
  meeting: ScheduleItem;
};

export type SearchResult =
  TaskSearchResult | RecordSearchResult | MeetingSearchResult;

export type WhoAmI = {
  workspace: { id: string; name: string; slug: string; plan: "free" | "pro" };
  member: {
    authUserId: string;
    name: string | null;
    email: string | null;
    role: string | null;
  };
  expiresAt: string | null;
  capabilities: {
    search: string[];
    taskCreate: boolean;
    taskUpdate: string[];
    taskDetails: boolean;
    commentCreate: string[];
    activityRead: boolean;
    notifications: string[];
    dailyBrief: boolean;
    recordWrite: boolean;
    meetingWrite: boolean;
  };
};

export type NotificationCategory =
  "mentions" | "assigned" | "task_updates" | "record_activity" | "other";

export type KatoNotification = {
  id: string;
  type: string;
  category: NotificationCategory;
  entityType: string;
  entityId: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actor: Profile | null;
  webUrl: string | null;
};

export type DailyBrief = {
  tasks: Task[];
  meetings: ScheduleItem[];
  notifications: KatoNotification[];
  integrationIssues: Array<{ id: string; title: string; message: string }>;
};

export type TaskAssigneeOption = {
  authUserId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type TaskRecordOption = {
  id: string;
  title: string;
  avatarUrl: string | null;
  objectTypeName: string;
  icon: string;
  color: string;
};

export type TaskSectionOption = {
  id: string;
  name: string;
  color: string;
  recordId: string;
  recordTitle: string;
};

export type TaskCreateOptions = {
  currentMemberId: string;
  members: TaskAssigneeOption[];
  records: TaskRecordOption[];
  sections: TaskSectionOption[];
  meetings: ScheduleItem[];
};
