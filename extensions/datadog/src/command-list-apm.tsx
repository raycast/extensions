import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useAPM } from "./useAPM";
import { linkDomain } from "./util";

// noinspection JSUnusedGlobalSymbols
export default function CommandListAPM() {
  const { apm, apmIsLoading } = useAPM();

  return (
    <List isLoading={apmIsLoading}>
      {apm.map(({env, name, calls}) => (
        <List.Item
          key={`${env}-${name}`}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={name}
          subtitle={calls?.length > 0 ? `Calls ${calls.join(", ")}` : undefined}
          accessoryTitle={env}
          keywords={[env].concat(calls)}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://${linkDomain()}/apm/service/${name}?env=${env}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
