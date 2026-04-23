import { open, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { providers } from "./providers";

export default async function main(props: { arguments: { query: string } }) {
  const query = props.arguments.query || "";
  if (query.trim() === "") {
    await showToast({ style: Toast.Style.Failure, title: "No query provided" });
    return;
  }

  const prefs = getPreferenceValues<Preferences>();
  const isPhone = /^\d+$/.test(query.trim());

  const urls = providers
    .filter((p) => prefs[p.preferenceKey as keyof Preferences])
    .map((p) => (isPhone ? p.phoneUrl(query.trim()) : p.nameUrl(query.trim())));

  if (urls.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No services selected",
      message: "Enable at least one service in preferences",
    });
    return;
  }

  try {
    await Promise.all(urls.map((url) => open(url)));
    await showToast({
      style: Toast.Style.Success,
      title: `Opened ${urls.length} tab${urls.length > 1 ? "s" : ""} in browser`,
    });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open URLs", message: String(error) });
  }
}
