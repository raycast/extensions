import { useMemo } from "react";
import { Activity } from "./types";

export function getLastActivity(activities?: Activity[]): Activity | undefined {
  if (!activities || activities.length === 0) {
    return undefined;
  }
  const sorted = [...activities].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  return sorted[0];
}

export function useLastActivity(activities?: Activity[]): Activity | undefined {
  return useMemo(() => getLastActivity(activities), [activities]);
}
