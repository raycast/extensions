import { useCachedState } from "@raycast/utils";
import type { Emoticon } from "../types/emoticons";

export const useRecent = (recentNumber: number = 3) => {
  const [state, setState] = useCachedState<Emoticon[]>("recently-used", []);

  const addToRecentlyUsed = (emoticon: Emoticon) => {
    setState((recents: Emoticon[]) => {
      return [emoticon, ...recents.filter((e) => e.name !== emoticon.name)];
    });
  };

  return {
    recentlyUsed: state.slice(0, recentNumber),
    addToRecentlyUsed,
  };
};
