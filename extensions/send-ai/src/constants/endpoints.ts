export const URL_ENDPOINTS = {
  GOOGLE_AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  GOOGLE_FETCH_USER_INFO_URL: "https://www.googleapis.com/oauth2/v3/userinfo",
  GOOGLE_TOKEN_URL: "https://oauth2.googleapis.com/token",
  SEND_AI_API_URL: "https://api.sendai.fun/api",
  BACKEND_CALLBACK_URL: "https://auth.sendai.fun/auth/google/verify",
} as const;
