export type AttendanceStatus = "complete" | "partial" | "pending" | "absent" | "late" | "holiday" | "empty";

export type AttendanceDay = {
  date: Date;
  day: number;
  weekday: string;
  isPending: boolean;
  holidayType: string;
  shift: string;
  clockIn: string;
  clockOut: string;
  workTime: string;
  breakTime: string;
  statusText: string;
  status: AttendanceStatus;
};

export type AttendanceMonth = {
  year: number;
  month: number;
  days: AttendanceDay[];
};

export type SubmitAttendanceOptions = {
  username: string;
  password: string;
  year: number;
  month: number;
  day: number;
  startTime: string;
  endTime: string;
  notice: string;
};
