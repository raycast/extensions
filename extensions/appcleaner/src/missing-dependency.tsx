import { Action, ActionPanel, Detail } from "@raycast/api";
import { UNINSTALLERS } from "./lib/constants";

export function MissingDependency() {
  const error = `
# You need at least one of the following uninstallers installed:
${UNINSTALLERS.map((u) => `- [${u.name}](${u.url})`).join("\n")}
`;

  const uninstallersActions = UNINSTALLERS.map((u) => (
    <Action.OpenInBrowser key={u.id} icon={u.icon} title={`Get ${u.name}`} url={u.url} />
  ));

  return <Detail markdown={error} navigationTitle="Error" actions={<ActionPanel>{uninstallersActions}</ActionPanel>} />;
}
