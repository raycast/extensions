import { ChromiumProfile } from "./chromium";

export const sortProfiles = (profiles: ChromiumProfile[]) => {
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

export const titleToPreferenceKey = (title: string): string => {
  return `show${title.replace(/\s+/g, "")}`;
};
