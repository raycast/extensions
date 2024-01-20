import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { isNumber, isEmpty } from "lodash";

const DEFAULT_PROMPT = `## Target\n\nsummarize the contents\n\n## Requirements\n\n- Output a minimum of 50 characters, maximum of 200 characters\n\n- Remove from the summary any references to author publicity and promotion.\n\n- Output the summarized content in a straightforward manner, without restating the requirements.\n\n## Respond Language\n\nRespond in the language of the user input content, not the language of the prompt itself.`;

function isNum(value?: string) {
  if (isEmpty((value || "").trim())) return false;

  return isNumber(+value!);
}

export function normalizePreference(): Required<Preferences> {
  const values = getPreferenceValues();

  return {
    provider: values.provider ?? "openai",
    apiKey: values.apiKey || "",
    apiModel: values.apiModel || "gpt-3.5-turbo-16k",
    apiHost: values.apiHost || "",
    httpProxy: values.httpProxy || "",
    summarizePrompt: (values.summarizePrompt || "").trim() || DEFAULT_PROMPT,
    maxItemsPerFeed: isNum(values.maxItemsPerFeed) ? +values.maxItemsPerFeed : 10,
    maxApiConcurrency: isNum(values.maxApiConcurrency) ? +values.maxApiConcurrency : 3,
    notificationTime: values.notificationTime || "9am",
    autoGenDigest: values.autoGenDigest ?? false,
    requestTimeout: isNum(values.requestTimeout) ? +values.requestTimeout * 1000 : 20000,
    enableItemLinkProxy: values.enableItemLinkProxy ?? true,
    writeFreelyEndpoint: values.writeFreelyEndpoint || "",
    writeFreelyAccount: values.writeFreelyAccount || "",
    writeFreelyPassword: values.writeFreelyPassword || "",
  };
}
