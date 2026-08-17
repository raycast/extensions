import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { TextCleaner } from "./lib/text-cleaner";
import { URLQueryParamRules } from "./lib/url-rules";
import { copyResult } from "./lib/run-clipboard";
import { readPreferences, urlRulesFromPrefs } from "./lib/prefs";
import { resolveTextInput } from "./lib/resolve-text-input";

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const text = resolveTextInput(props.arguments.url, await Clipboard.readText());
  if (text === null) {
    await showToast({ style: Toast.Style.Failure, title: "No URL provided" });
    return;
  }

  const rules = urlRulesFromPrefs(readPreferences());
  const stripped = new TextCleaner().stripURLQueryParamsResolving(text, (host) =>
    URLQueryParamRules.keepParams(host, rules),
  );

  if (stripped === null) {
    const looksLikeUrl = /^https?:\/\//i.test(text.trim());
    if (looksLikeUrl && !props.arguments.url?.trim()) {
      await showHUD("No tracking parameters to remove");
      return;
    }
    if (looksLikeUrl) {
      await copyResult(text.trim(), "URL already clean");
      return;
    }
    await showToast({ style: Toast.Style.Failure, title: "Not a URL" });
    return;
  }

  await copyResult(stripped, "Copied cleaned URL");
}
