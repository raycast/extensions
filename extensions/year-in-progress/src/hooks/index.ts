import { useCachedState as useRaycastCachedState } from "@raycast/utils";
import { Progress } from "../types";
import { getDefaultProgress } from "../utils/progress";

export const useCachedProgressState = (): [Progress[], React.Dispatch<React.SetStateAction<Progress[]>>] => {
  const defaultProgress = getDefaultProgress();
  return useRaycastCachedState<Progress[]>("userProgress", defaultProgress);
};
