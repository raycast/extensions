import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  api_base: string;
}

export const getConfig = async (): Promise<Preferences> => {
  const preferences = await getPreferenceValues<Preferences>();
  return preferences;
}

export const getAPIBase = async (): Promise<string> => {
  const config = await getConfig();
  return config.api_base || "https://api.coze.cn";
}

const DEFAULT_CN_COZE_CLIENT_ID = "30367348905137699749500653976611.app.coze";
// TODO: add com client id
const DEFAULT_COM_COZE_CLIENT_ID = "30367348905137699749500653976611.app.coze";

export const getClientId = async (baseUrl: string): Promise<string> => {
  return (
    baseUrl.includes("coze.cn") || baseUrl.includes(".net")
  ) ? DEFAULT_CN_COZE_CLIENT_ID : DEFAULT_COM_COZE_CLIENT_ID;
}

export const DEFAULT_REDIRECT_URL = "https://raycast.com/redirect/extension";
