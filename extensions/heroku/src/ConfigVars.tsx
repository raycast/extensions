import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ConfigVars } from "@youri-kane/heroku-client/dist/requests/apps";
import useSWR, { mutate } from "swr";
import heroku, { simplifyCustomResponse } from "./heroku";
import { EditConfigVarsForm, NewConfigVarsForm } from "./ConfigVars/Form";

export default function ConfigVars({ appId, appName }: { appId: string; appName: string }) {
  const { data, error } = useSWR(["config-vars", appId], () =>
    heroku.requests.getAppConfigVars({ params: { appId } }).then(simplifyCustomResponse)
  );

  if (!data) {
    return <List isLoading />;
  }

  return (
    <List navigationTitle={`${appName} Environment Variables`}>
      {Object.entries(data).map(([key, value]) => (
        <List.Item
          title={key}
          key={key}
          accessoryTitle={value}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Variable"
                icon={Icon.Gear}
                target={<EditConfigVarsForm env={key} configVars={data} appName={appName} appId={appId} />}
              />
              <Action.Push title="New Variable" icon={Icon.Plus} target={<NewConfigVarsForm appId={appId} />} />
              <Action
                title="Delete Variable"
                icon={Icon.Trash}
                onAction={async () => {
                  await heroku.requests.updateAppConfigVars({
                    params: { appId },
                    body: { [key]: null },
                  });

                  mutate(["config-vars", appId]);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
