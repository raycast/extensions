import type { Session } from "../helper";
import { useEntities } from "./useEntities";
export function useTags(bound?: Session | null) {
  return useEntities("tag", bound);
}
