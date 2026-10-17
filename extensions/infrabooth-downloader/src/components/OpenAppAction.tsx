import { Action, Icon } from "@raycast/api";
import { openDesktopApp } from "../lib/feedback";

export function OpenAppAction() {
  return <Action title="Open InfraBooth Downloader" icon={Icon.AppWindow} onAction={openDesktopApp} />;
}
