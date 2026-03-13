import { getPreferenceValues, popToRoot, getDefaultApplication, open } from "@raycast/api";

export async function executeSearchToOpen({ query }: Arguments.ChatgptSearch) {
  const { isTemporaryChat, extraQueryParams } = getPreferenceValues<Preferences.ChatgptSearch>();

  await popToRoot();

  const params = new URLSearchParams({
    q: query,
    ...(isTemporaryChat ? { "temporary-chat": "true" } : {}),
  });

  if (extraQueryParams) {
    extraQueryParams.split(",").forEach((param) => {
      const [key, value] = param.split("=");
      if (key && value) {
        params.append(key.trim(), value.trim());
      }
    });
  }

  const url = new URL("https://chatgpt.com/");
  url.search = params.toString();

  const defaultBrowserBundleId = (await getDefaultApplication(url.toString())).bundleId;

  await open(url.toString(), defaultBrowserBundleId);
}
