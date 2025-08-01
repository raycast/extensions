export interface AuthGetTokenResponse {
  token: string;
}

export interface AuthGetSessionResponse {
  session: {
    name: string;
    key: string;
    subscriber: number;
  };
}

export interface AuthErrorResponse {
  error: number;
  message: string;
}
