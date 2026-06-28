import { useCachedPromise } from "@raycast/utils";
import { getStatus } from "../apple-music";

export const useStatus = () => {
  return useCachedPromise<typeof getStatus>(getStatus);
};
