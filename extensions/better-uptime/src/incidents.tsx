import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
}

interface IncidentItem {
  id: string;
  type: string;
  attributes: IncidentItemAttributes;
}

interface IncidentItemAttributes {
  name: string;
  url: string;
  http_method: string;
  cause: string;
  started_at: string;
  screenshot_url: string;
  call: boolean;
  sms: boolean;
  email: boolean;
  push: boolean;
}

interface State {
  isLoading: boolean;
  items: IncidentItem[];
  error?: any;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({ items: [], isLoading: true });

  useEffect(() => {
    async function fetchIncidents() {
      setState((previous) => ({ ...previous, isLoading: true }));

      try {
        const { data } = await axios.get("https://betteruptime.com/api/v2/incidents", {
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

    fetchIncidents();
  }, []);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading incidents",
        message: state.error.response.data.errors,
      });
    }
  }, [state.error]);

  return (
    <List isShowingDetail isLoading={state.isLoading}>
      {state.items?.map((item: IncidentItem, index: number) => (
        <List.Item
          key={index}
          title={item.attributes.name}
          subtitle={item.attributes.url}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
                  <List.Item.Detail.Metadata.Label title="URL" text={item.attributes.url ?? "-"} />
                  <List.Item.Detail.Metadata.Label
                    title="HTTP Method"
                    text={item.attributes.http_method ? item.attributes.http_method.toUpperCase() : "-"}
                  />
                  <List.Item.Detail.Metadata.Label title="Cause" text={item.attributes.cause} />
                  <List.Item.Detail.Metadata.Label
                    title="Started At"
                    text={item.attributes.started_at.replace("T", " ")}
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
              {item.attributes.screenshot_url && (
                <Action.OpenInBrowser title="Open Screenshot in Browser" url={item.attributes.screenshot_url} />
              )}
              {item.attributes.screenshot_url && (
                <Action
                  title="Copy Screenshot URL"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(item.attributes.screenshot_url);

                    showToast({
                      title: "Copied",
                      message: "Screenshot URL copied to clipboard",
                    });
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
