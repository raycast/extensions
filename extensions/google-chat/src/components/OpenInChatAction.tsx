import { Action, Icon, Keyboard } from "@raycast/api";

import { openWithApp } from "../helpers/feedback";

/** Opens a Google Chat link in the "Open With" app from preferences, or the default browser. */
export function OpenInChatAction({ url, title = "Open in Google Chat" }: { url: string; title?: string }) {
  return (
    <Action.Open
      title={title}
      target={url}
      application={openWithApp()}
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
