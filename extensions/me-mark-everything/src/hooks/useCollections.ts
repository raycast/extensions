import { useMemo } from "react";
import type { Session } from "../helper";
import { toCollections } from "../helpers/me";
import { useEntities } from "./useEntities";
export function useCollections(bound?: Session | null) {
  const options = useEntities("collection", bound);
  const data = useMemo(() => options.entities && toCollections(options.entities), [options.entities]);
  return { ...options, data };
}
