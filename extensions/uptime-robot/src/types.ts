export type Account = {
  email: string;
  user_id: number;
  firstname: string;
  sms_credits: number;
  payment_processor: string | null;
  payment_period: string | null;
  subscription_expiry_date: string | null;
  monitor_limit: number;
  monitor_interval: number;
  up_monitors: number;
  down_monitors: number;
  paused_monitors: number;
  total_monitors_count: number;
  registered_at: string;
  active_subscription: string | null;
  organizations: unknown[];
};

type MonitorLog = {
  id: number;
  type: number;
  datetime: number;
  duration: number;
  reason: {
    code: number;
    detail: string;
  };
};
export type Monitor = {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  sub_type: string;
  keyword_type: number;
  keyword_case_type: number;
  keyword_value: string;
  http_username: string;
  http_password: string;
  port: string;
  interval: number;
  timeou: number;
  status: number;
  create_datetime: number;
  logs: MonitorLog[];
};

export type NewMonitor = {
  friendly_name: string;
  url: string;
  type: string;
  interval: string;
  timeout: string;
};

export type SuccessResponse<T> = {
  stat: "ok";
} & T;

export type ErrorResponse = {
  stat: "fail";
  error: {
    type: string;
    parameter_name: string;
    passed_value: string;
    message: string;
  };
};
