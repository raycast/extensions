import { getFrontmostApplication } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export function useFrontmostApplication() {
  const {
    data: frontmostApp,
    isLoading,
    mutate,
    revalidate,
  } = useCachedPromise(async () => {
    return await getFrontmostApplication();
  });

  return { frontmostApp, isLoading, mutate, revalidate };
}
