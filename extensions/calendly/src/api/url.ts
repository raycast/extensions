const API_BASE_URL = "https://api.calendly.com";
const API_ORIGIN = new URL(API_BASE_URL).origin;

export function calendlyApiUrl(path: string) {
  const url = new URL(path, API_BASE_URL);
  if (url.origin !== API_ORIGIN) {
    throw new Error(`Calendly API requests must target ${API_ORIGIN}.`);
  }
  return url;
}
