/**
 * Hook wrapper around the Homebrew major-version gate — see
 * `src/utils/brew/brew-version.ts`.
 */

import { usePromise } from "@raycast/utils";
import { getBrewMajorVersion } from "../utils";

export function useBrewMajorVersion(): { major: number | undefined; isLoading: boolean; revalidate: () => void } {
  const { data, isLoading, revalidate } = usePromise(() => getBrewMajorVersion(), []);
  return { major: data, isLoading, revalidate };
}
