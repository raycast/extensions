export const JWT_TOKEN_STORAGE_KEY = "aztu_jwt_token";
export const JWT_TOKEN_TIMESTAMP_KEY = "aztu_jwt_token_time";
export const LAST_LMS_LOGIN_LINK_KEY = "aztu_last_login_link";
export const LAST_LMS_LOGIN_TIMESTAMP_KEY = "aztu_last_login_time";
export const IS_LOGINED_USING_WEB = "aztu_is_logined_using_web";
export const ONE_HOUR_IN_MS = 60 * 60 * 1000;
export const LMS_BASE_URL = "https://lms.aztu.edu.az";

export const commonHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0",
  Accept: "application/json, text/plain, */*",
  Origin: LMS_BASE_URL,
  Referer: LMS_BASE_URL,
  "Content-Type": "application/json",
  "X-Client-Time": Date.now().toString(),
};
