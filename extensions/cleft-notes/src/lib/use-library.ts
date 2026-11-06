import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readLibrary, resolveSyncFolder } from "./notes";

async function loadLibrary(syncFolder?: string) {
  return readLibrary(await resolveSyncFolder(syncFolder));
}

export function useLibrary() {
  const { syncFolder } = getPreferenceValues<Preferences>();
  const { data, error, isLoading, revalidate } = usePromise(
    loadLibrary,
    [syncFolder],
    { onError: () => undefined },
  );
  return { library: data, error, isLoading, refresh: revalidate };
}
