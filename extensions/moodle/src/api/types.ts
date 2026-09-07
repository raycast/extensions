export interface MoodlePreferences {
  moodleUrl: string;
  apiToken: string;
  downloadDirectory?: string;
  calendarName?: string;
}

export interface MoodleSiteInfo {
  sitename: string;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  lang: string;
  userid: number;
  siteurl: string;
  userpictureurl: string;
  functions?: { name: string; version: string }[];
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname?: string;
  idnumber?: string;
  summary?: string;
  summaryformat?: number;
  format?: string;
  startdate?: number;
  enddate?: number;
  timemodified?: number;
  progress?: number | null;
  completed?: boolean;
  enrolledusercount?: number;
  category?: number;
}

export interface MoodleContent {
  type: string;
  filename: string;
  filepath?: string;
  filesize: number;
  fileurl: string;
  timecreated?: number;
  timemodified: number;
  sortorder?: number;
  mimetype?: string;
  isexternalfile?: boolean;
}

export interface MoodleModule {
  id: number;
  url?: string;
  name: string;
  instance: number;
  contextid?: number;
  visible?: number;
  uservisible?: boolean;
  visibleoncoursepage?: number;
  modicon?: string;
  modname: string; // 'resource', 'folder', 'assign', 'url', 'forum', 'quiz', 'page', etc.
  modplural?: string;
  contents?: MoodleContent[];
  description?: string;
}

export interface MoodleCourseSection {
  id: number;
  name: string;
  visible?: number;
  summary?: string;
  summaryformat?: number;
  section: number;
  uservisible?: boolean;
  modules: MoodleModule[];
}

export interface MoodleAssignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  nosubmissions?: number;
  submissiondrafts?: number;
  duedate: number;
  allowsubmissionsfromdate?: number;
  grade?: number;
  timemodified?: number;
  cutoffdate?: number;
  gradingduedate?: number;
  intro?: string;
  introattachments?: MoodleContent[];
  courseName?: string;
  isSubmitted?: boolean;
}

export interface MoodleAssignmentsResponse {
  courses: {
    id: number;
    fullname: string;
    shortname: string;
    timemodified: number;
    assignments: MoodleAssignment[];
  }[];
  warnings?: unknown[];
}

export interface MoodleCalendarEvent {
  id: number;
  name: string;
  description?: string;
  course?: {
    id: number;
    fullname: string;
    shortname: string;
  };
  timestart: number;
  timeduration: number;
  timesort: number;
  eventtype: string;
  url?: string;
  action?: {
    name: string;
    url: string;
    actionable: boolean;
  };
}

export interface MoodleActionEventsResponse {
  events: MoodleCalendarEvent[];
  firstid?: number;
  lastid?: number;
}

export interface MoodleNotification {
  id: number;
  useridfrom: number;
  useridto: number;
  subject: string;
  text: string;
  fullmessage?: string;
  fullmessagehtml?: string;
  smallmessage?: string;
  contexturl?: string;
  contexturlname?: string;
  timecreated: number;
  read: boolean;
  userfromfullname?: string;
}

export interface MoodleNotificationsResponse {
  notifications: MoodleNotification[];
  unreadcount?: number;
}
