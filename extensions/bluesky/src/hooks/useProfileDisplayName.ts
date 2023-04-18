import { useEffect, useState } from "react";

import { Cache } from "@raycast/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export const useProfileDisplayName = (ProfileCacheKey: string, sessionStarted: boolean) => {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStarted) {
      return;
    }

    const cache = new Cache();
    const response = cache.get(ProfileCacheKey);
    const profile: ProfileViewDetailed = response ? JSON.parse(response) : null;

    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName ? profile.displayName : profile.handle);
  }, [sessionStarted]);

  return displayName;
};
