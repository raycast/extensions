export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface ScheduleSlot {
  id: string;
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  room: string;
  meetingLink?: string;
}

export interface Professor {
  name: string;
  email?: string;
}

export interface Course {
  id: string;
  title: string;
  courseCode?: string;
  color?: string;
  icon?: string;
  units?: number;
  classLink?: string;
  extraLink?: string;
  schedules: ScheduleSlot[];
  professor?: Professor;
  ephemeral?: boolean;
  expiresAt?: string;
}

export interface ScheduleGroup {
  id: string;
  name: string;
  courses: Course[];
  createdAt: string;
  archived: boolean;
}

export interface AppData {
  groups: ScheduleGroup[];
  activeGroupId: string | null;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  slots: Omit<ScheduleSlot, "id">[];
  createdAt: string;
}
