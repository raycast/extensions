import { Action, Keyboard } from "@raycast/api";

function OpenInClickUpAction({ route, override = false }: { route: string; override?: boolean }) {
  return (
    <Action.OpenInBrowser
      icon="clickup-icon.png"
      title="Open in Clickup"
      url={override ? route : `https://app.clickup.com/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export { OpenInClickUpAction };
