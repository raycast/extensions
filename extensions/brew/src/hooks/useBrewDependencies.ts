import { useCachedState } from "@raycast/utils";

export const useBrewDependencies = (): [
  excludeDependencies: boolean,
  setExcludedDependencies: (value: boolean) => void,
] => {
  return useCachedState("exclude-dependencies", false);
};
