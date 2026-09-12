import { Action, ActionPanel, List } from "@raycast/api";
import { useAPM } from "./useAPM";
import { linkDomain, notEmpty } from "./util";

// noinspection JSUnusedGlobalSymbols
export default function CommandListAPM() {
  const { apm, apmIsLoading } = useAPM();

  return (
    <List isLoading={apmIsLoading}>
      {apm.map(({ env, name, calls }) => (
        <List.Item
          key={`${env}-${name}`}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={name}
          subtitle={calls?.length > 0 ? `Calls ${calls.join(", ")}` : undefined}
          accessories={[{ text: env }]}
          keywords={[env].concat(calls).filter(notEmpty)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}/apm/service/${name}?env=${env}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
