import { BrowserProfile, Browser } from "./types";

export const sortProfiles = (profiles: BrowserProfile[]) => {
  profiles.sort((profileA, profileB) => {
    if (profileA.name.toLowerCase() < profileB.name.toLowerCase()) {
      return -1;
    }
    if (profileA.name.toLowerCase() > profileB.name.toLowerCase()) {
      return 1;
    }
    return 0;
  });
};

export const isBrowserEnabled = (filters: string[], browser: Browser) => {
  if (!filters) {
    return true;
  }

  for (const filter of filters) {
    if (browser.title.includes(filter) || browser.type.includes(filter)) {
      return true;
    }
  }

  return false;
};
