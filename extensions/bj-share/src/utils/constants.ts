export const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
export const STORAGE_KEY_FEEDS = "rssFeeds";
export const BASE_URL_DETAILS = "https://bj-share.info/torrents.php?torrentid=";

export const FILENAME_FORBIDDEN_CHARS = /[/\\?%*:|"<>]/g;

export const TORRENT_SPECS_REGEX =
  /\s*\[(?:\d{3,4}p?|MKV|MP4|AVI|x264|x265|HEVC|WEB-DL|Blu-ray|Jogo|Pack|v\d{4}|4K|UHD|DV)/i;
export const BRACKETS_CONTENT_REGEX = /\[(.*?)\]/g;
export const INTERNAL_TAG_REGEX = /\s*INTERNAL\s*$/i;
export const TRAILING_DASH_REGEX = /\s+-\s*$/;
export const FREE_TAG_CLEANUP_REGEX = /\s*\/?\s*Free/gi;
export const FREELEECH_DETECTION_REGEX = /\[[^\]]*\bfree\b[^\]]*\]/i;
