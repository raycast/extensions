import { Form, ActionPanel, Action, showToast, Toast, open, Icon, getPreferenceValues, List } from "@raycast/api";
import axios from "axios";
import { string } from "prop-types";
import { useEffect, useState } from "react";
import { ucfirst } from "./utils";

interface Preferences {
  apiKey: string;
}

interface MonitorItem {
  id: string;
  type: string;
  attributes: MonitorItemAttributes;
}

interface MonitorItemAttributes {
  url: string;
  pronounceable_name: string;
  monitor_type: string;
  last_checked_at: string;
  status: string;
  check_frequency: number;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
}

interface State {
  isLoading: boolean;
  items: MonitorItem[];
  error?: Error;
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
  };

  useEffect(() => {
    async function fetchMonitors() {
      setState((previous) => ({ ...previous, isLoading: true }));

      try {
        const { data } = await axios.get("https://betteruptime.com/api/v2/monitors", {
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

    fetchMonitors();
  }, []);

  return (
    <List isShowingDetail>
      {state.items?.map((item: MonitorItem, index: number) => (
        <List.Item
          key={index}
          icon={statusMap[item.attributes.status] ?? "🔍"}
          title={item.attributes.url}
          subtitle={item.attributes.pronounceable_name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="URL" text={item.attributes.url} />
                  <List.Item.Detail.Metadata.Label
                    title="Pronounceable Name"
                    text={item.attributes.pronounceable_name}
                  />
                  <List.Item.Detail.Metadata.Label title="Monitor Type" text={ucfirst(item.attributes.monitor_type)} />
                  <List.Item.Detail.Metadata.Label
                    title="Check Frequency"
                    text={`${item.attributes.check_frequency} seconds`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Last Checked At"
                    text={item.attributes.last_checked_at.replace("T", " ")}
                  />

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
              <Action
                title="Open in Browser"
                onAction={() => {
                  open("url");
                }}
              />
              <Action title="Select" onAction={() => console.log(`${item.attributes.url} selected`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
