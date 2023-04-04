import { Action, Icon } from "@raycast/api";
import { prefs } from "./preferences";

export function OpenUrlAction({ url }: { url: string }) {
  const desktop = prefs.urlTarget === "desktop";
  return (
    <Action.OpenInBrowser
      title={desktop ? "Open in App" : "Open in Browser"}
      icon={desktop ? Icon.AppWindow : Icon.Globe}
      url={desktop ? url.replace(/^https:/, "msteams:") : url}
    />
  );
}
