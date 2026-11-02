import { Action } from "@raycast/api";
import { DigFromSources } from "./components/DigFromSources";
import { canReadBrowserTab, fromBrowserTab } from "./utils/urlSources";

export default function Command() {
  return (
    <DigFromSources
      readers={[fromBrowserTab]}
      extraActions={
        canReadBrowserTab() || process.platform === "win32" ? null : (
          <Action.OpenInBrowser title="Get the Browser Extension" url="https://www.raycast.com/browser-extension" />
        )
      }
    />
  );
}
