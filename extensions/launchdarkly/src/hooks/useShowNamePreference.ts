import { useCachedState } from "@raycast/utils";

export function useShowNamePreference() {
  const [showName, setShowName] = useCachedState<boolean>("SHOW_NAME_KEY", true);

  function toggleShowName() {
    setShowName((prev) => !prev);
  }

  function updateShowName(newValue: boolean) {
    setShowName(newValue);
  }

  return {
    showName,
    toggleShowName,
    updateShowName,
  };
}
