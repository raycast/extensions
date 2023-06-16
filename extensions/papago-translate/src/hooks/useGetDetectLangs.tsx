import qs from "qs";
import { apiInstance } from "../api/axios";
import { SearchText } from "../types";
import { Toast, showToast } from "@raycast/api";
import { useIsErrorCodeWrite, useIsLoadingAtom } from "../atoms/status";

const useGetDetectLangs = () => {
  const [_, setIsLoading] = useIsLoadingAtom();
  const setIsErrorCode = useIsErrorCodeWrite();

  const getDetectLangs = async (searchText: SearchText) => {
    try {
      const res = await apiInstance.post("/detectLangs", qs.stringify({ query: searchText }));
      return (res?.data?.langCode as string) || "en";
    } catch (e: any) {
      showToast(Toast.Style.Failure, "Could not detect the language", e);
      setIsLoading(false);
      setIsErrorCode(Number(e?.response?.status));
    }
  };
  return getDetectLangs;
};

export default useGetDetectLangs;
