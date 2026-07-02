export const MOBILE_HOST_POOL = [
  "https://api6.aoneroom.com",
  "https://api5.aoneroom.com",
  "https://api4.aoneroom.com",
  "https://api4sg.aoneroom.com",
  "https://api3.aoneroom.com",
  "https://api6sg.aoneroom.com",
  "https://api.inmoviebox.com",
];

export const WEB_API_BASE = "https://h5-api.aoneroom.com";

export const USER_AGENT_MOBILE =
  "com.community.oneroom/50020042 (Linux; U; Android 9; en_US; 23078RKD5C; Build/PQ3A.190605.03081104; Cronet/135.0.7012.3)";
export const USER_AGENT_WEB =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const CLIENT_INFO = {
  package_name: "com.community.oneroom",
  version_name: "3.0.03.0529.03",
  version_code: 50020042,
  os: "android",
  os_version: "9",
  install_ch: "ps",
  install_store: "ps",
  brand: "Redmi",
  model: "23078RKD5C",
  system_language: "en",
  net: "NETWORK_WIFI",
  region: "US",
  timezone: "America/New_York",
  sp_code: "40401",
  "X-Play-Mode": "2",
};

export const getClientInfo = (deviceId: string, gaid: string) =>
  JSON.stringify({ ...CLIENT_INFO, device_id: deviceId, gaid });

export const WEB_HOME_PATH = "/wefeed-h5api-bff/page-api/home";
export const WEB_SEARCH_PATH = "/wefeed-h5api-bff/subject/search";
export const WEB_RESOURCE_PATH = "/wefeed-h5api-bff/subject/download";

export const MOBILE_MAIN_PAGE_PATH = "/wefeed-mobile-bff/tab-operating";
export const MOBILE_SEARCH_PATH = "/wefeed-mobile-bff/subject-api/search/v2";
export const MOBILE_SEARCH_PATH_V1 = "/wefeed-mobile-bff/subject-api/search";
export const MOBILE_RESOURCE_PATH = "/wefeed-mobile-bff/subject-api/resource";
export const MOBILE_SUBJECT_GET_PATH = "/wefeed-mobile-bff/subject-api/get";
export const MOBILE_SEASON_INFO = "/wefeed-mobile-bff/subject-api/season-info";
export const MOBILE_EXT_CAPTIONS_PATH =
  "/wefeed-mobile-bff/subject-api/get-ext-captions";

export const SECRET_KEY_DEFAULT = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";

export enum SubjectType {
  ALL = 0,
  MOVIE = 1,
  TV_SERIES = 2,
  ANIME = 8,
}

export enum TabID {
  ALL = "All",
  MOVIE = "Movie",
  TV_SERIES = "TV",
  ANIME = "MovieTV",
}
