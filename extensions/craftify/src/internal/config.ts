import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  nativeLanguage: string;
  llmModel: string;
  llmToken: string;
}

const { llmModel, llmToken, nativeLanguage } = getPreferenceValues<Preferences>();

export { llmModel, llmToken, nativeLanguage };
