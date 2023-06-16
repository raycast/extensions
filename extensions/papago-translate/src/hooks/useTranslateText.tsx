import qs from "qs";
import { Toast, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import { Preferences, SearchText } from "../types";
import { apiInstance } from "../api/axios";
import useGetDetectLangs from "./useGetDetectLangs";
import debounce from "lodash/debounce";
import { useIsErrorCodeWrite, useIsLoadingAtom } from "../atoms/status";

const preferences = getPreferenceValues<Preferences>();

const useTranslateText = () => {
  const getDetectLangs = useGetDetectLangs();
  const { source: userSelectSource, target } = preferences;
  const [_, setIsLoading] = useIsLoadingAtom();
  const setIsErrorCode = useIsErrorCodeWrite();

  const detectTarget = ({ sourceLang, target }: Record<string, string | undefined>) => {
    //when same first Language and second Language
    if (sourceLang === target) {
      //change korean when both lanaguage is english
      if (target === "en") return "ko";
      //basic translate language is english.
      return "en";
    }
    return target;
  };

  const debouncedTranslate = debounce(async (text, resolve, reject) => {
    const detectLang = async () => {
      if (userSelectSource === "auto") {
        const detectedLang = await getDetectLangs(text);
        return detectedLang;
      } else {
        return userSelectSource;
      }
    };

    try {
      const sourceLang = await detectLang();
      const response = await apiInstance.post(
        "/n2mt",
        qs.stringify({
          text,
          source: sourceLang,
          target: detectTarget({ sourceLang, target }),
        })
      );

      const result = (response?.data?.message?.result?.translatedText as string) || "";
      resolve(result);
    } catch (e: any) {
      showToast(Toast.Style.Failure, "Could not translate", e);
      setIsLoading(false);
      setIsErrorCode(Number(e?.response?.status));
    }
  }, 300);

  const translateText = (text: SearchText) => {
    return new Promise<string>((resolve, reject) => {
      debouncedTranslate(text, resolve, reject);
    });
  };

  return translateText;
};

export default useTranslateText;
