import { Failure } from "../helper";

/** One field represents one URL. Never split punctuation inside a URL. */
export function singleUrl(value: string): string {
  if (!/^https?:\/\//.test(value) || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
    throw new Failure("INVALID", "Enter one complete HTTP or HTTPS URL without control characters.");
  try {
    if (!new URL(value).hostname) throw Error();
  } catch {
    throw new Failure("INVALID", "Enter one complete HTTP or HTTPS URL.");
  }
  return value;
}

export function inputUrl(value: string): string {
  const input = value.trim();
  if (/\s/u.test(input)) throw new Failure("INVALID", "Enter one URL per field. Encode spaces as %20.");
  if (!input) throw new Failure("INVALID", "Enter a URL or remove this row.");
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(input) && !/^https?:\/\//.test(input))
    throw new Failure("INVALID", "Only HTTP and HTTPS URLs can be saved.");
  return singleUrl(/^https?:\/\//.test(input) ? input : "https://" + input);
}
