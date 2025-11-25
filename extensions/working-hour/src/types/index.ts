/**
 * 考勤数据相关类型定义
 */

export interface AttendanceData {
  WorkPeriod: {
    text: string;
  };
  SwipingCardDate: {
    value: string;
  };
  ActualForFirstCard?: {
    value: string;
  };
  ActualForLastCard?: {
    value: string;
  };
  [key: string]: unknown;
}

export interface AttendanceResponse {
  biz_data: AttendanceData[];
}

export interface WorkHourStats {
  avg: number;
  delta: number;
  lateCount: number;
}

export interface DailyAttendance {
  date: string;
  workHours: number;
  firstCard?: string;
  lastCard?: string;
  isLate: boolean;
}

export interface LoginRequest {
  UseLoginGeetest: boolean;
  Remember: string;
  Domin: string;
  ReturnUrl: string;
  UseLoginMutex: boolean;
  MutexToken: string;
  LoginType: number;
  UserName: string;
  Password: string;
  lt: string;
}

export interface Preferences {
  phoneNumber: string;
  password: string;
  userText: string;
  uid: string;
  targetHour?: string;
  refreshInterval?: string;
}
