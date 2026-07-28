// Keywords for email filtering
export const emailFilterKeywords = [
  "login",
  "log in",
  "sign in",
  "register",
  "sign up",
  "verify",
  "verification",
  "authenticate",
  "authentication",
  "otp",
  "code",
  "confirm",
  "activate",
  "approve",
  "secure",
  "2fa",
];

// Max. age of emails in minutes
export const maxEmailAge = 10;

// Link scoring constants
export const SCORE_STRONG_CTA = 120;
export const SCORE_GENERIC_CTA = 65;
export const SCORE_PATH_INTENT = 35;
export const SCORE_SAME_DOMAIN = 30;
export const SCORE_BEFORE_FOOTER = 15;
export const SCORE_LEARNED_EXACT = 20;
export const SCORE_LEARNED_PARTIAL = 10;

export const PENALTY_INVALID = -1000;
export const PENALTY_NEGATIVE_INTENT = -500;
export const PENALTY_NO_VISIBLE_TEXT = -100;
export const PENALTY_TRACKING = -75;
export const PENALTY_GENERIC_CLICK = -40;

export const AUTO_SELECT_THRESHOLD = 130;
export const AUTO_SELECT_MARGIN = 30;

export const LEARNED_PATTERN_MAX_AGE_DAYS = 180;
export const LEARNED_PATTERN_VERSION = 1;

// Strong positive CTA phrases (visible anchor text)
export const STRONG_CTA_PHRASES = [
  "verify email address",
  "verify email",
  "confirm email",
  "confirm your email",
  "authenticate your email",
  "activate account",
  "approve sign in",
  "complete sign in",
  "continue sign in",
  "secure your account",
];

// Generic positive CTA words/phrases
export const GENERIC_CTA_PHRASES = [
  "verify",
  "verification",
  "confirm",
  "authenticate",
  "approve",
  "activate",
  "sign in",
  "login",
  "log in",
  "continue",
];

// Strong negative/footer phrases
export const NEGATIVE_CTA_PHRASES = [
  "privacy",
  "privacy policy",
  "privacy center",
  "manage privacy",
  "manage preferences",
  "preferences",
  "unsubscribe",
  "opt out",
  "contact",
  "help",
  "support",
  "terms",
  "cookie",
  "cookies",
  "view in browser",
  "web version",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "twitter",
  "x",
  "share",
  "download app",
];

// Path/query tokens that indicate verification intent
export const VERIFICATION_PATH_TOKENS = [
  "verify",
  "verification",
  "confirm",
  "authenticate",
  "auth",
  "activate",
  "approve",
  "secure",
  "login",
  "signin",
  "sign-in",
  "welcome",
];

// Query parameter names that may carry readable redirects
export const REDIRECT_PARAMETER_NAMES = [
  "redirect",
  "redirect_uri",
  "return",
  "return_url",
  "continue",
  "next",
  "target",
  "destination",
  "callback",
  "url",
];

// Tracking-related host or path fragments
export const TRACKING_FRAGMENTS = [
  "tracking",
  "track",
  "click",
  "unsub",
  "preferences",
  "analytics",
  "pixel",
  "beacon",
  "open",
  "social",
];
