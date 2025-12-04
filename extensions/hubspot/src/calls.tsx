import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useCalls } from "@/hooks/useCalls";

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { isLoading, data } = useCalls();

  const calls = data?.results;

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      <List.EmptyView title="No Calls Found" icon="noview.png" />

      {calls?.map((call) => {
        const hs_call_title = call?.properties?.hs_call_title;
        const hs_call_body = call.properties?.hs_call_body;
        const hs_call_to_number = call?.properties?.hs_call_to_number;
        const hs_call_status = call?.properties?.hs_call_status;
        const createdate = call.properties.hs_timestamp;

        const props = showingDetail
          ? {
              detail: (
                <List.Item.Detail
                  markdown={hs_call_body}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={hs_call_title} />
                      <List.Item.Detail.Metadata.Label title="Status" text={hs_call_status} />
                      <List.Item.Detail.Metadata.Label title="Created" text={new Date(createdate).toLocaleString()} />
                      <List.Item.Detail.Metadata.Label title="To Number" text={hs_call_to_number || ""} />
                    </List.Item.Detail.Metadata>
                  }
                />
              ),
            }
          : {
              accessories: [
                {
                  tooltip: hs_call_body,
                },
                {
                  text: hs_call_status,
                },
                {
                  date: new Date(createdate),
                },
              ],
            };

        return (
          <List.Item
            key={call.id}
            title={hs_call_title}
            subtitle={hs_call_to_number}
            icon={Icon.Message}
            id={call.id}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
