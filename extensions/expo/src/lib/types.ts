//common types
export interface ErrorResponse {
  errors: ErrorsItem[];
}

export interface ErrorsItem {
  code: string;
  message: string;
  isTransient: boolean;
  requestId: string;
}
