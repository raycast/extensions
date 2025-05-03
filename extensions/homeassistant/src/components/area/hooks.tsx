import { useCachedPromise } from "@raycast/utils";
import { getHAAreas } from "./utils";

export function useHAAreas() {
  const { data, error, isLoading } = useCachedPromise(async () => {
    return await getHAAreas();
  }, []);

  return { areas: data, error, isLoading };
}
