import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";
import axiosInstance from "./axiosInstance";
import ERROR from "./error";
import Style = Toast.Style;

interface I_preferences {
  sourceLanguage: string;
  targetLanguage: string;
  korEngMode: boolean;
}

const PAPAGO_TRANSLATE_API_URL = "https://naveropenapi.apigw.ntruss.com/nmt/v1/translation";

const PAPAGO_DETECT_API_URL = "https://naveropenapi.apigw.ntruss.com/langs/v1/dect";

const { sourceLanguage, targetLanguage, korEngMode } = getPreferenceValues<I_preferences>();

export const getDetectLanguage = async (text: string) => {
  try {
    const response = await axiosInstance.post(PAPAGO_DETECT_API_URL, {
      query: text,
    });

    return response.data.langCode;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      showToast({
        style: Style.Failure,
        title: "Fail",
        message: ERROR[error?.response?.status as keyof typeof ERROR],
      });
      return text;
    }
  }
};

export const getTranslationText = async (text: string) => {
  let source = sourceLanguage;
  let target = targetLanguage;

  if (korEngMode) {
    source = await getDetectLanguage(text);
    target = source === "ko" ? "en" : "ko";
  }

  if (source === target) return { status: 200, translatedText: text };

  try {
    const response = await axiosInstance.post(PAPAGO_TRANSLATE_API_URL, {
      source,
      target,
      text,
    });

    return { status: 200, translatedText: response.data.message.result.translatedText };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      showToast({
        style: Style.Failure,
        title: "Fail",
        message: ERROR[error?.response?.status as keyof typeof ERROR],
      });
      return { status: error?.response?.status, translatedText: undefined };
    }
  }
};
