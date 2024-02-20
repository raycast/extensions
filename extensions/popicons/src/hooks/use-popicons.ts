import { showToast } from "@raycast/api";
import { Toasts } from "../constants/toasts";
import { isPopiconsApiError } from "../helpers/is-popicons-api-error";
import { isUserIsLikelyOfflineError } from "../helpers/is-user-is-likely-offline-error";
import { useFetchPopIcons } from "./use-fetch-popicons";
import { useLocalPopicons } from "./use-local-popicons";
import { useNewPopicons } from "./use-new-popicons";

function usePopicons() {
  const { icons: localIcons, isLoading: isLoadingLocalIcons, setIcons: setLocalIcons } = useLocalPopicons();

  const { revalidate: retryFetchingIcons } = useFetchPopIcons({
    onWillExecute: async () => {
      showToast(Toasts.FetchPopIcons.Loading);
    },
    onData: (fetchedIcons) => {
      if (localIcons && fetchedIcons.length > localIcons.length) {
        showToast(Toasts.FetchPopIcons.SuccessNewIcons(fetchedIcons.length - localIcons.length));
        const newIcons = fetchedIcons.filter((icon) => !localIcons.some((localIcon) => localIcon.name === icon.name));
        setNewIcons(newIcons);
      } else {
        showToast(Toasts.FetchPopIcons.Success);
      }
      setLocalIcons(fetchedIcons);
    },
    onError: (err) => {
      if (isPopiconsApiError(err)) {
        showToast(Toasts.FetchPopIcons.FetchError(err, retryFetchingIcons));
      } else if (isUserIsLikelyOfflineError(err)) {
        showToast(Toasts.FetchPopIcons.OfflineError(retryFetchingIcons));
      } else {
        throw err;
      }
    },
  });

  const [newIcons, setNewIcons] = useNewPopicons();

  return {
    isLoading: isLoadingLocalIcons,
    icons: localIcons,
    newIcons: newIcons,
  };
}

export { usePopicons };
