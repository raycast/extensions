import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  api_base: string;
  debug: boolean;
}

export const getConfig = async (): Promise<Preferences> => {
  const preferences = await getPreferenceValues<Preferences>();
  return preferences;
}

export const DEFAULT_CN_COZE_CLIENT_ID = "30367348905137699749500653976611.app.coze";
export const DEFAULT_COM_COZE_CLIENT_ID = "02133605691962138570345894167696.app.coze";

export const DEFAULT_REDIRECT_URL = "https://raycast.com/redirect/extension";

export const getClientId = async (baseUrl: string): Promise<string> => {
  return (
    baseUrl.includes("coze.cn") || baseUrl.includes("bytedance.net")
  ) ? DEFAULT_CN_COZE_CLIENT_ID : DEFAULT_COM_COZE_CLIENT_ID;
}

