import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { statusMap } from "./constants";
import { MonitorItem, Preferences, MonitorsState } from "./interface";
import { ucfirst } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<MonitorsState>({ items: [], isLoading: true });

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

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading monitors",
        message: state.error.response.data.errors,
      });
    }
  }, [state.error]);

  return (
    <List isShowingDetail isLoading={state.isLoading}>
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

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
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
              <Action.OpenInBrowser title="Open URL in Browser" url={item.attributes.url} />
              <Action
                title="Copy URL"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(item.attributes.url);

                  showToast({
                    title: "Copied",
                    message: "URL copied to clipboard",
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
