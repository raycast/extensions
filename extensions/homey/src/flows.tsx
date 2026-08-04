import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";

import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { type FlowGroup, type HomeyFlow, Homey, HomeyAuthenticationError } from "./lib/Homey";

export default function Command() {
  const [flows, setFlows] = useState<FlowGroup[]>([]);
  const [homey] = useState<Homey>(new Homey());
  const [loading, setLoading] = useState<boolean>(true);
  const authorizingRef = useRef<boolean>(false);
  useEffect(() => {
    const fetchData = async () => {
      if (authorizingRef.current) {
        return;
      }
      try {
        authorizingRef.current = true;
        await homey.auth();
        await homey.selectFirstHomey();
        const flows = await homey.getFlowsWithFolders();
        setLoading(false);
        setFlows(flows);
      } catch (error) {
        console.error(error);
        setLoading(false);
        if (!(error instanceof HomeyAuthenticationError)) {
          await showToast({
            title: "Failed to load flows",
            style: Toast.Style.Failure,
          });
        }
      } finally {
        authorizingRef.current = false;
      }
    };
    const timer = setInterval(() => {
      if (homey.getHomey()) {
        fetchData();
      }
    }, 30000);
    fetchData();
    return () => {
      clearInterval(timer);
    };
  }, [homey]);
  return (
    <List isLoading={loading}>
      {flows
        .sort((a: FlowGroup, b: FlowGroup) => Math.sign(b.order - a.order))
        .map((folder) => (
          <List.Section key={folder.name} title={folder.name}>
            {folder.flows &&
              folder.flows
                .sort((a: HomeyFlow, b: HomeyFlow) => Math.sign(b.order - a.order))
                .map((flow: HomeyFlow) => (
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
                                await homey.triggerFlow(flow.id, flow?.advanced);

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
                              homey.getHomey()?.id +
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
