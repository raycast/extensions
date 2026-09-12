import { useFetch } from "@raycast/utils";
import { BridgeVersion } from "../interface";

const useFetchBridge = () => {
  const linuxFetch = useFetch<BridgeVersion>("https://proton.me/download/current_version_linux.json");
  const macOSFetch = useFetch<BridgeVersion>("https://proton.me/download/current_version_darwin.json");
  const windowsFetch = useFetch<BridgeVersion>("https://proton.me/download/current_version_windows.json");

  const isLoading = linuxFetch.isLoading || macOSFetch.isLoading || windowsFetch.isLoading;

  return {
    isLoading,
    linuxFetch,
    macOSFetch,
    windowsFetch,
  };
};

export default useFetchBridge;
