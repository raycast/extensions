import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  descriptApiToken: string;
};

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Bearer tokens must be ASCII; non-Latin-1 chars make `fetch` throw before the request is sent. */
const TOKEN_FORMAT = /^[\x21-\x7E]+$/;

export function getApiToken(): string {
  const token = getPreferences().descriptApiToken?.trim();
  if (!token) {
    throw new MissingTokenError();
  }
  if (!TOKEN_FORMAT.test(token)) {
    throw new InvalidTokenError();
  }
  return token;
}

export class MissingTokenError extends Error {
  constructor() {
    super("Descript API token is not set. Open Raycast preferences for the Descript extension to add one.");
    this.name = "MissingTokenError";
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super(
      "The Descript API token contains invalid characters. Copy only the token from Descript (Settings → API tokens), not surrounding text or punctuation like an ellipsis.",
    );
    this.name = "InvalidTokenError";
  }
}
