export type ActiveDomain = {
  domain_id: string;
  domain_name: string;
  sld: string;
  tld: string;
  backend: string;
  internal_status: string;
  ns_1: string;
  ns_2: string;
  ns_3?: string;
  ns_4?: string;
  whois_privacy_enabled: string;
  auto_renew_enabled: string;
  date_registered: string;
  date_expiration: string;
};

type ErrorResult = {
  auth_success: boolean;
  request_success: false;
  error_message: string;
};
type SuccessResult<T> = {
  auth_success: true;
  request_success: true;
  response: T;
};
export type Result<T> = ErrorResult | SuccessResult<T>;
