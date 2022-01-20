import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useAPM } from "./useAPM";

// noinspection JSUnusedGlobalSymbols
export default function CommandListAPM() {
  const { apm, apmIsLoading } = useAPM();

  return (
    <List isLoading={apmIsLoading}>
      {apm.map(apm => (
        <List.Item
          key={`${apm.env}-${apm.name}`}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={apm.name}
          subtitle={apm.calls?.length > 0 ? `Calls ${apm.calls.join(", ")}` : undefined}
          accessoryTitle={apm.env}
          keywords={[apm.env].concat(apm.calls)}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://app.datadoghq.com/apm/service/${apm.name}?env=${apm.env}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
