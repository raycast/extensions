export interface Assertion {
  type: string;
  operator: string;
  value: string | number;
}

export interface Monitor {
  id: number;
  name: string;
  status: string;
  paused: boolean;
  protocol: string;
  request: {
    url: string;
    method: string;
    tls_skip_verify: boolean;
    follow_redirects: boolean;
  };
  interval: number;
  timeout: number;
  success_assertions: Assertion[];
  incident_confirmations: number;
  recovery_confirmations: number;
  regions: string[];
  response_time: number;
  updated_at: string;
  created_at: string;
}

export interface Preferences {
  phareApiKey: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface CreateMonitorForm {
  name: string;
  url: string;
  method: string;
  interval: string;
  timeout: string;
  regions: string[];
  incidentConfirmations: string;
  recoveryConfirmations: string;
  followRedirects: boolean;
  tlsSkipVerify: boolean;
  keyword: string;
  userAgentSecret: string;
  statusCodeAssertion: string;
}
