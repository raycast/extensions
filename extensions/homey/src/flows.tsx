import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { Homey } from "./lib/Homey";

export default function Command() {
  const [flows, setFlows] = useState<any[]>([]);
  const [homey, setHomey] = useState<Homey>(new Homey());
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchData = async () => {
      await homey.auth();
      await homey.selectFirstHomey();
      const flows = await homey.getFlowsWithFolders();
      setFlows(flows);
      setLoading(false);
    };
    fetchData();
  }, [homey]);

  return (
    <List isLoading={loading}>
      {flows
        .sort((a, b) => Math.sign(b.order - a.order))
        .map((folder) => (
          <List.Section key={folder.name} title={folder.name}>
            {folder.flows &&
              folder.flows
                .sort((a: any, b: any) => Math.sign(b.order - a.order))
                .map((flow: any) => (
                  <List.Item
                    key={flow.id}
                    icon={{
                      source: flow.triggerable && flow.enabled ? Icon.PlayFilled : Icon.XMarkCircleFilled,
                      tintColor: flow.triggerable && flow.enabled ? Color.Green : Color.Red,
                    }}
                    title={flow.name}
                    actions={
                      <ActionPanel title={flow.name}>
                        <ActionPanel.Section>
                          {flow.triggerable && flow.enabled && (
                            <Action
                              title="Start Flow"
                              icon={Icon.PlayFilled}
                              onAction={async () => {
                                //  //@ts-ignore
                                homey.triggerFlow(flow.id, flow?.advanced);

                                await showToast({
                                  title: "Flow triggered",
                                  message: flow.name,
                                  style: Toast.Style.Success,
                                });
                              }}
                            ></Action>
                          )}
                          <Action.OpenInBrowser
                            title="Goto Flow Editor"
                            url={
                              "https://my.homey.app/homeys/" +
                              homey.getHomey().id +
                              "/flows/" +
                              (flow?.advanced ? "advanced/" : "") +
                              flow.id
                            }
                          ></Action.OpenInBrowser>
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                ))}
          </List.Section>
        ))}
    </List>
  );
}
