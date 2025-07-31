import { getDefaultApplication, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Props } from "./Props";
import { ExtensionPreferences } from "./ExtensionPreferences";

export function useChatGptSearch({ useChatgptApp, useTemporaryChat }: ExtensionPreferences) {
  return useForm<Props>({
    onSubmit: async ({ query }) => {
      popToRoot();

      const params = new URLSearchParams({
        q: query,
        hints: "search",
        ref: "rycast-chatgpt-search",
        ...(useTemporaryChat ? { "temporary-chat": "true" } : {}),
      });

      const url = new URL("https://chatgpt.com/");
      url.search = params.toString();

      const defaultBrowserBundleId = (await getDefaultApplication(url.toString())).bundleId;

      await open(url.toString(), useChatgptApp ? "com.openai.chat" : defaultBrowserBundleId);
    },
    initialValues: { query: "" },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });
}
