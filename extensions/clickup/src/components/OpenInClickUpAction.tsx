import { Action, Keyboard } from "@raycast/api";

function OpenInClickUpAction({ route, override = false }: { route: string; override?: boolean }) {
  return (
    <Action.OpenInBrowser
      icon="clickup-icon.png"
      // eslint-disable-next-line @raycast/prefer-title-case
      title="Open in ClickUp"
      url={override ? route : `https://app.clickup.com/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export { OpenInClickUpAction };
