import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  verboseLogging: boolean;
}

const isDev = process.env.NODE_ENV === "development";

function isVerboseEnabled(): boolean {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return preferences.verboseLogging;
  } catch {
    // If preferences aren't available yet, default to false
    return false;
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev && isVerboseEnabled()) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev && isVerboseEnabled()) {
      console.warn(...args);
    }
  },
  error: (msg: string, err?: unknown) => {
    if (isDev) {
      console.error(msg, err);
    } else {
      console.error(msg);
    }
  },
};
