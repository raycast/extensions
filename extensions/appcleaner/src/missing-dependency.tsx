import { Action, ActionPanel, Detail } from "@raycast/api";
import { UNINSTALLERS } from "./lib/constants";

export function MissingDependency() {
  const error = `
# Uninstaller app missing.
Please select an uninstaller app in the extension settings.

If you don’t have one installed, you can choose one of the following:
${UNINSTALLERS.map((u) => `- [${u.name}](${u.url})`).join("\n")}
`;

  const uninstallersActions = UNINSTALLERS.map((u) => (
    <Action.OpenInBrowser key={u.id} icon={u.icon} title={`Get ${u.name}`} url={u.url} />
  ));

  return <Detail markdown={error} navigationTitle="Error" actions={<ActionPanel>{uninstallersActions}</ActionPanel>} />;
}
