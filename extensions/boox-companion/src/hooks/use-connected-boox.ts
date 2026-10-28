import { getConnectedBoox } from "../discovery/discover";
import { useQuery } from "./use-query";

export function useConnectedBoox() {
  return useQuery("connected-boox", () => getConnectedBoox());
}
