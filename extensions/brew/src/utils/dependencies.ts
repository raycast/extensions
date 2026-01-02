import { useCachedState } from "@raycast/utils";

export const useDependenciesFilter = () => {
  const [excludeDependencies, setExcludeDependencies] = useCachedState("exclude-dependencies", false);

  return {
    excludeDependencies,
    setExcludeDependencies,
  };
};
