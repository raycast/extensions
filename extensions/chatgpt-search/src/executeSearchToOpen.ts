import { getPreferenceValues, popToRoot, getDefaultApplication, open } from "@raycast/api";
import { ExtensionPreferences } from "./ExtensionPreferences";
import { Props } from "./Props";

export async function executeSearchToOpen({ query }: Props) {
  const { useChatgptApp, useTemporaryChat } = getPreferenceValues<ExtensionPreferences>();

  popToRoot();

  const params = new URLSearchParams({
    q: query,
    hints: "search",
    ref: "raycast-chatgpt-search",
    ...(useTemporaryChat ? { "temporary-chat": "true" } : {}),
  });

  const url = new URL("https://chatgpt.com/");
  url.search = params.toString();

  const defaultBrowserBundleId = (await getDefaultApplication(url.toString())).bundleId;

  await open(url.toString(), useChatgptApp ? "com.openai.chat" : defaultBrowserBundleId);
}
