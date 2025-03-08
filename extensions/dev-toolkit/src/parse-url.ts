import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const url = new URL(clipboardText.trim());

    const result = {
      original: url.toString(),
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || "default",
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
      host: url.host,
      username: url.username || "none",
      password: url.password ? "present" : "none",
      searchParams: Object.fromEntries(url.searchParams.entries()),
    };

    await produceOutput(JSON.stringify(result, null, 2));
  } catch (error) {
    await showError("Failed to parse URL: " + String(error));
  }
}
