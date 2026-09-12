import { closeMainWindow, Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";

const HIPSTER_IPSUM_API_CONNECTION_ERROR = "Failed to connect to Hipster Ipsum API";
export const HIPSTER_IPSUM_API_BASE_URL = "http://hipsum.co/api/";
export const DEFAULT_PARAGRAPHS = "3";
export const DEFAULT_SENTENCES = "3";

export const getParagraphs = async (numberOfParagraphs?: string) => {
  const { type, paras, startWithLorem } = getPreferenceValues<Preferences>();
  const paragraphsCount = numberOfParagraphs || paras || DEFAULT_PARAGRAPHS;

  const fetchUrl = `${HIPSTER_IPSUM_API_BASE_URL}?type=${type}&paras=${paragraphsCount}&start-with-lorem=${startWithLorem ? "1" : "0"}`;

  try {
    const response = await axios.get(fetchUrl);
    const paragraphs = await response.data;

    return { error: null, paragraphs: paragraphs as string[] };
  } catch (error) {
    console.error(`${HIPSTER_IPSUM_API_CONNECTION_ERROR}:`, error);

    return { error: { message: HIPSTER_IPSUM_API_CONNECTION_ERROR }, paragraphs: [] };
  }
};

export const getSentences = async (numberOfSentences?: string) => {
  const { type, sentences, startWithLorem } = getPreferenceValues<Preferences>();
  const sentencesCount = numberOfSentences || sentences || DEFAULT_SENTENCES;

  const fetchUrl = `${HIPSTER_IPSUM_API_BASE_URL}?type=${type}&sentences=${sentencesCount}&start-with-lorem=${startWithLorem ? "1" : "0"}`;

  try {
    const response = await axios.get(fetchUrl);
    const sentences = await response.data;

    return { error: null, sentences: sentences as string[] };
  } catch (error) {
    console.error(`${HIPSTER_IPSUM_API_CONNECTION_ERROR}:`, error);

    return { error: { message: HIPSTER_IPSUM_API_CONNECTION_ERROR }, sentences: [] };
  }
};

export const showError = async (msg: string) => {
  await closeMainWindow();
  await showToast(Toast.Style.Failure, msg);
};

export const produceOutput = async (content: string) => {
  const { action } = getPreferenceValues();

  await closeMainWindow();

  switch (action) {
    case "clipboard":
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      await showToast(Toast.Style.Success, "Pasted to active app! 📝");
      break;

    case "pasteAndCopy":
      await Clipboard.paste(content);
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Pasted to active app and copied to clipboard! 📋");
      break;
  }
};
