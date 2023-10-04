import { useCachedState as useRaycastCachedState } from "@raycast/utils";
import { Deadline } from "../types";

export const useCachedDeadlines = (): [Deadline[], React.Dispatch<React.SetStateAction<Deadline[]>>] => {
  const [deadlines, setDeadlines] = useRaycastCachedState<Deadline[]>("deadlines", []);

  return [deadlines, setDeadlines];
};
