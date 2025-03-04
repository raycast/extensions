import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  httpProxy: string;
  enableGoogleTranslate: boolean;
  enableTencentTranslate: boolean;
  tencentSecretId: string;
  tencentSecretKey: string;
  enableGLMTranslate: boolean;
  glmApiKey: string;
  enableOpenAITranslate: boolean;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  enableDeepseekTranslate: boolean;
  deepseekApiKey: string;
  enableYoudaoTranslate: boolean;
  enableRaycastTranslate: boolean;
}

export const preferences = getPreferenceValues<ExtensionPreferences>();
