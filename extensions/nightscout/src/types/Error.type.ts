export type ErrorType =
  | "invalid-url"
  | "not-found"
  | "unauthorized"
  | "rate-limit"
  | "connection"
  | "data-validation"
  | "preferences-validation";

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string[];
  instanceUrl?: string;
  hasToken?: boolean;
}

export interface ErrorState {
  error: AppError | null;
  isError: boolean;
}
