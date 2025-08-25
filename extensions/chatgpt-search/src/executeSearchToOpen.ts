import { getPreferenceValues, popToRoot, getDefaultApplication, open } from "@raycast/api";

export async function executeSearchToOpen({ query }: Arguments.ChatgptSearch) {
  const { useChatgptApp, useTemporaryChat } = getPreferenceValues<Preferences.ChatgptSearch>();

  await popToRoot();

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
