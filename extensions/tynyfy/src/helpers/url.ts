import isUrl from "is-url";

export function isValidUrl(string: any) {
  return isUrl(string) && isValidHttpUrl(string);
}

export function isValidHttpUrl(string: any) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}
