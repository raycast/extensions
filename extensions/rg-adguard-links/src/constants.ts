export const API_URL = "https://store.rg-adguard.net/api/GetFiles";

export const REGEX = {
  // Matches 9N0KWG910LDH format
  PRODUCT_ID: /([0-9][A-Z0-9]{11,13})/i,
  // Matches 19.31 MB
  SIZE_TEXT: /([\d.]+)\s*([KMGT]?B)/i,
  // Matches version numbers in filenames like _1.2.3.0_
  VERSION_FROM_FILENAME: /_([\d.]+)_/,
  // HTML Parsing
  TITLE_TAG: /<title>([^<]+)<\/title>/i,
  H1_TAG: /<h1[^>]*>([^<]+)<\/h1>/i,
  TABLE_ROW: /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<\/tr>/gi,
  SIZE_IN_ROW: />(\d+\.?\d*\s*[KMGT]?B)</i,
};

// Toggle this to true for development testing
export const USE_DUMMY_DATA = false;
