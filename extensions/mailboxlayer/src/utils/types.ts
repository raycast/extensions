type ErrorResponse = {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
};
type SuccessResponse = {
  email: string;
  did_you_mean: string;
  user: string;
  domain: string;
  format_valid: boolean;
  mx_found: boolean;
  smtp_check: boolean;
  catch_all: boolean;
  role: boolean;
  disposable: boolean;
  free: boolean;
  score: number;
};
export type APIResponse = ErrorResponse | SuccessResponse;
