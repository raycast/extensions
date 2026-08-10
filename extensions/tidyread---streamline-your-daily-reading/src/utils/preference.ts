import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { isNumber, isEmpty } from "lodash";

const DEFAULT_PROMPT = `Summarize the content within 50-200 characters, directly output. Focusing strictly on its core insights. Exclude promotional content, including podcast listening options, subscription offers, access instructions, and any form of contact details for additional services. Most important, respond in {{lang}}.`;

function isNum(value?: string) {
  if (isEmpty((value || "").trim())) return false;

  return isNumber(+value!);
}

// In order to provide better experience, we should set different default values for different providers. Benchmark is 30 articles.
const PROVIDER_CONFIG = {
  openai: {
    maxApiConcurrency: 10,
    retryCount: 2,
    retryDelay: 5,
  },
  raycast: {
    maxApiConcurrency: 5,
    retryCount: 3,
    retryDelay: 20,
  },
  moonshot: {
    maxApiConcurrency: 3,
    retryCount: 2,
    retryDelay: 5,
  },
};

export function normalizePreference(): Required<Preferences> {
  const values = getPreferenceValues();

  const defaultApiConfig = PROVIDER_CONFIG[values.provider as keyof typeof PROVIDER_CONFIG];

  return {
    provider: values.provider ?? "openai",
    apiKey: values.apiKey || "",
    apiModel: values.apiModel || "",
    maxTokens: isNum(values.maxTokens) ? +values.maxTokens : 200,
    apiHost: values.apiHost || "",
    preferredLanguage: values.preferredLanguage || "",
    httpProxy: values.httpProxy || "",
    summarizePrompt: (values.summarizePrompt || "").trim() || DEFAULT_PROMPT,
    maxItemsPerFeed: isNum(values.maxItemsPerFeed) ? +values.maxItemsPerFeed : 5,
    maxApiConcurrency: isNum(values.maxApiConcurrency) ? +values.maxApiConcurrency : defaultApiConfig.maxApiConcurrency,
    retryCount: isNum(values.retryCount) ? +values.retryCount : defaultApiConfig.retryCount,
    // 默认重试延迟时间为30秒
    retryDelay: isNum(values.retryDelay) ? +values.retryDelay * 1000 : defaultApiConfig.retryDelay * 1000,
    notificationTime: values.notificationTime || "9am",
    autoGenDigest: values.autoGenDigest ?? false,
    requestTimeout: isNum(values.requestTimeout) ? +values.requestTimeout * 1000 : 30 * 1000,
    enableItemLinkProxy: values.enableItemLinkProxy ?? true,
    splitByTags: values.splitByTags ?? true,
    writeFreelyEndpoint: values.writeFreelyEndpoint || "",
    writeFreelyAccount: values.writeFreelyAccount || "",
    writeFreelyPassword: values.writeFreelyPassword || "",
  };
}
