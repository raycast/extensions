import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
}

interface HeartbeatItem {
  id: string;
  type: string;
  attributes: HeartbeatItemAttributes;
}

interface HeartbeatItemAttributes {
  url: string;
  name: string;
  period: number;
  grace: number;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
  status: string;
}

interface State {
  isLoading: boolean;
  items: HeartbeatItem[];
  error?: any;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({ items: [], isLoading: true });
  const statusMap = {
    paused: "⏸",
    pending: "🔍",
    maintenance: "🚧",
    up: "✅",
    validating: "🤔",
    down: "❌",
  } as { [key: string]: string };

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
              <Action
                title="Copy Heartbeat URL"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(item.attributes.url);

                  showToast({
                    title: "Copied",
                    message: "Heartbeat URL copied to clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
