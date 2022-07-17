import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { ActionCopyHeartbeatUrl, ActionDeleteHeartbeat } from "./actions";
import { statusMap } from "./constants";
import { HeartbeatItem, HeartbeatsState, Preferences } from "./interface";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<HeartbeatsState>({ items: [], isLoading: true });

  useEffect(() => {
    async function fetchHeartbeats() {
      setState((previous) => ({ ...previous, isLoading: true }));

      try {
        const { data } = await axios.get("https://betteruptime.com/api/v2/heartbeats", {
          headers: { Authorization: `Bearer ${preferences.apiKey}` },
        });

        setState((previous) => ({ ...previous, items: data.data, isLoading: false }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchHeartbeats();
  }, []);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading heartbeats",
        message: state.error.response.data.errors,
      });
    }
  }, [state.error]);

  return (
    <List isShowingDetail isLoading={state.isLoading}>
      {state.items?.map((item: HeartbeatItem, index: number) => (
        <List.Item
          key={index}
          icon={statusMap[item.attributes.status] ?? "🔍"}
          title={item.attributes.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
                  <List.Item.Detail.Metadata.Label title="Period" text={`${item.attributes.period}`} />
                  <List.Item.Detail.Metadata.Label title="Grace" text={`${item.attributes.grace}`} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Notifications" />

                  <List.Item.Detail.Metadata.Label title="Call" text={item.attributes.call ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="SMS" text={item.attributes.sms ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="Email" text={item.attributes.email ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="Push" text={item.attributes.push ? "Yes" : "No"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Heartbeat URL in Browser" url={item.attributes.url} />
              <ActionCopyHeartbeatUrl url={item.attributes.url} />
              <ActionDeleteHeartbeat item={item} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
