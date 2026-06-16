export const STARLINE_ORIGINS = {
    developer: "https://developer.starline.ru/",
    id: "https://id.starline.ru/",
} as const;

export const API_VERSION = {
    v1: "v1",
    v2: "v2",
    v3: "v3",
    v4: "v4",
} as const;

export type ApiVersion = (typeof API_VERSION)[keyof typeof API_VERSION];

export const LOCAL_STORAGE = {
    CAPTCHA_SID: "starline-captcha-sid",
    CAPTCHA_IMG: "starline-captcha-img",
    USER_ID: "starline-user-id",
    DEFAULT_DEVICE: "starline-default-device",
} as const;

export const AUTH_SECRET = {
    APP_CODE: "app-code",
    APP_TOKEN: "app-token",
    SLID_USER_TOKEN: "slid-user-token",
    SLNET_TOKEN: "slnet-token",
} as const;

export const SECRETS_LIFETIME_HOURS = {
    [AUTH_SECRET.APP_CODE]: 1,
    [AUTH_SECRET.APP_TOKEN]: 4,
    [AUTH_SECRET.SLID_USER_TOKEN]: 4,
    [AUTH_SECRET.SLNET_TOKEN]: 24,
} as const;
