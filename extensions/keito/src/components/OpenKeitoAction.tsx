import { Action, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { KEITO_WEB_URL } from "../services/keito/config";
import { getKeitoApp } from "../services/keitoApp";

/** Opens an installed app named "Keito" if there is one, otherwise the Keito web app. */
export function OpenKeitoAction() {
  const { data: app } = usePromise(getKeitoApp);

  if (app) {
    return (
      <Action.Open
        title="Open Keito App"
        target={app.path}
        application={app}
        icon={Icon.AppWindow}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    );
  }
  return (
    <Action.OpenInBrowser
      title="Open Keito in Browser"
      url={KEITO_WEB_URL}
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
