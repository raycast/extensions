import { Timezone } from "./datetime";

export interface User {
  id: string;
  email: string;
  principal: string;
  provider: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  admin: boolean;
  timestampOffsetMs: number;
  settings: UserSettings;
  created: string;
  onboarded: boolean;
  trackingCode: string;
  locale: string;
  likelyPersonal: boolean;
  hostedDomain: string;
  primaryCalendar: UserPrimaryCalendar;
  edition: string;
  editionAfterTrial: string;
  editionUsage: string;
  metadata: UserMetadata;
  timezone: Timezone;
  overage: boolean;
  slackEnabled: boolean;
  startOfWeek: string;
  primaryCalendarId: string;
  sku: string;
  features: UserFeatures;
}

export interface UserFeatures {
  scheduler: number;
  extraScopes: boolean;
  assistSettings: {
    travel?: boolean;
    otherTravelDuration?: number;
    conferenceBuffer?: boolean;
    conferenceBufferDuration?: number;
    assignmentPaddingDuration?: number;
    conferenceBufferPrivate?: boolean;
    customConferenceBufferTitle?: string;
    focus?: boolean;
    allOneOnOnesBusy?: boolean;
    sendMeetingNotifications?: boolean;
    useFreeBusyEmojis?: boolean;
    useLockEmoji?: boolean;
    includeDescription?: boolean;
    includeAttribution?: boolean;
    smartSeries?: boolean;
    showClassicHabits?: boolean;
    allowSmartSeriesOptIn?: boolean;
    smartSeriesMigrateComplete?: boolean;
    neverSeenClassicHabits?: boolean;
    assistDays?: number;
    bypassed?: boolean;
    dayZero?: string;
    schedulerDisabled?: boolean;
    rescheduleUnstarted?: boolean;
  };
  openAISettings: {
    enabled: boolean;
  };
  slackSettings: {
    enabled: boolean;
    personalSyncNotifyNew: boolean;
    personalSyncNotifyUpdated: boolean;
    personalSyncNotifyDeleted: boolean;
    personalSyncNotificationsIncludingSelf: boolean;
    habitNotifyUpcoming: boolean;
    taskNotifyUpcoming: boolean;
    travelNotify: boolean;
    outsideHoursMigrated: boolean;
    statusSync: string;
    outSideHours: {
      policy: string;
      dnd: boolean;
    };
    privateStatus: {
      template: string;
    };

    statusEnabled: boolean;
  };
  taskSettings: {
    enabled: boolean;
    googleTasks: boolean;
    defaults: {
      timeChunksRequired: number;
      commsTimeChunksRequired: number;
      delayedStartInMinutes: number;
      dueInDays: number;
      category: string;
      alwaysPrivate: boolean;
      minChunkSize: number;
      maxChunkSize: number;
      onDeck: boolean;
    };
    autoWorkflowSettings: {
      category: string;
    };
  };
  priorities: {
    enabled: boolean;
  };
  colors: {
    enabled: boolean;
    projectsEnabled: boolean;
    prioritiesEnabled: boolean;
    categoriesEnabled: boolean;
    lastModified: string;
    priorities: Record<string, string>;
    categories: {
      WORK: string;
      MEETING: string;
      EXTERNAL: string;
      PERSONAL: string;
      LOGISTICS: string;
      ONE_ON_ONE: string;
    };
  };
  calendar: {
    enabled: boolean;
  };
  focus: {
    enabled: boolean;
  };
  asana: {
    enabled: boolean;
  };
  billing: {
    enabled: boolean;
  };
  projects: {
    enabled: boolean;
  };
  sync: {
    enabled: boolean;
  };
  appNotifications: {
    enabled: boolean;
    unscheduledPriority: boolean;
  };
  googleAddOnSettings: {
    enabled: boolean;
  };
  interests: {
    tasks: boolean;
    priorities: boolean;
    office365: boolean;
    calendar: boolean;
    asana: boolean;
    trello: boolean;
    todoist: boolean;
    jira: boolean;
    linear: boolean;
    clickup: boolean;
    monday: boolean;
  };
  onboard: {
    habits: boolean;
    tasks: boolean;
    googleTasks: boolean;
    planItemPrioritized: boolean;
    smartOneOnOnes: boolean;
    bufferTime: boolean;
    tasksReindex: boolean;
    googleAddOn: boolean;
    schedulingLinks: boolean;
  };
  weeklyReport: {
    enabled: boolean;
    sendReport: boolean;
  };
  smartOneOnOnes: {
    enabled: boolean;
  };
  schedulingLinks: {
    enabled: boolean;
    note: string;
    remindersMigrated: boolean;
    shareTimesEnabled: boolean;
  };
  eventStorage: {
    enabled: boolean;
    writeMode: string;
    readMode: string;
    backfilled: boolean;
  };
  availableMeetingTimes: Array<number>;
  quests: {
    enabled: boolean;
  };
}

export interface UserSettings {
  autoAddHangouts: boolean;
  defaultEventLength: number;
  weekStart: number;
  format24HourTime: boolean;
  locale: string;
  showDeclinedEvents: boolean;
  timezone: string;
  dateFieldOrder: string;
}

export interface UserPrimaryCalendar {
  id: number;
  timezone: Timezone;
  calendarId: string;
  lastSynced: string;
  credentialId: number;
}

export interface UserMetadata {
  usecase: string;
  role: string;
  department: string;
}
