import { Action, Keyboard } from "@raycast/api";

import { useIsTodoistInstalled } from "../hooks/useIsTodoistInstalled";

type OpenInTodoistProps = {
  appUrl: string;
  webUrl: string;
};

export default function OpenInTodoist({ appUrl, webUrl }: OpenInTodoistProps) {
  const isTodoistInstalled = useIsTodoistInstalled();

  return isTodoistInstalled ? (
    <Action.Open
      title="Open in Todoist"
      target={appUrl}
      icon="todoist.png"
      application="Todoist"
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  ) : (
    <Action.OpenInBrowser title="Open in Browser" url={webUrl} shortcut={Keyboard.Shortcut.Common.Open} />
  );
}
