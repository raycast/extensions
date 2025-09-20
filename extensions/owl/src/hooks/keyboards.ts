import { captureException } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { loadKeyboards } from "../utils/keyboards";

export function useKeyboards() {
  const [keyboards, setKeyboards] = useCachedState<string[]>("keyboards", loadKeyboards());

  function revalidate() {
    try {
      setKeyboards(loadKeyboards());
    } catch (error) {
      captureException(error);
    }
  }

  return {
    keyboards,
    revalidate,
  };
}
