// PagerDuty API response types for on-call schedules

export interface PagerDutyUser {
  id: string;
  type: string;
  summary: string;
  self: string;
  html_url: string;
  name: string;
  email: string;
  time_zone: string;
  color: string;
  avatar_url: string;
  billed: boolean;
  role: string;
}

export interface PagerDutySchedule {
  id: string;
  type: string;
  summary: string; // PagerDuty API uses 'summary' not 'name'
  self: string;
  html_url: string;
  name?: string; // Sometimes present, sometimes not
  description?: string;
  time_zone?: string;
}

export interface PagerDutyEscalationPolicy {
  id: string;
  type: string;
  summary: string;
  self: string;
  html_url: string;
}

export interface PagerDutyOnCall {
  user: PagerDutyUser;
  schedule: PagerDutySchedule;
  escalation_policy: PagerDutyEscalationPolicy;
  escalation_level: number;
  start: string;
  end: string;
}

export interface PagerDutyApiResponse<T> {
  users?: T[];
  oncalls?: T[];
  schedules?: T[];
  limit: number;
  offset: number;
  total?: number;
  more?: boolean;
}

export interface OnCallScheduleEntry {
  schedule: PagerDutySchedule;
  user: PagerDutyUser;
  start: Date;
  end: Date;
  level: number;
}
