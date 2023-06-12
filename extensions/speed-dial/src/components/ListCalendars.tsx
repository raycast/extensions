import { ActionPanel, Action, List, showToast, Toast, Detail, Icon, confirmAlert, popToRoot } from "@raycast/api";

import { useEffect, useState } from "react";
import { Calendar, FetchColorsResponse } from "../types";
import * as google from "../oauth/google";
import ListEvents from "./ListEvents";

export default function ListCalendars() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<Calendar[]>([]);
  const [colors, setColors] = useState<FetchColorsResponse>();

  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
        const fetchedItems = await google.fetchCalendars();
        const colors = await google.fetchColors();
        setColors(colors);
        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {items
        .sort((item) => {
          // bring the primary calendar to the top
          if (item.primary) {
            return -1;
          }
          return 0;
        })
        .map((item) => {
          return (
            <List.Item
              key={item.id}
              id={item.id}
              icon={{
                source: item.primary ? Icon.CircleFilled : Icon.Circle,
                tintColor: colors?.calendar?.[item.colorId]?.background,
              }}
              title={`${item.summaryOverride || item.summary} ${item.primary ? "(Primary)" : ""}`}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={item.description || "No description"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Timezone" text={item.timeZone} />
                      <List.Item.Detail.Metadata.Label
                        title="Read Only?"
                        text={item.accessRole === "reader" ? "Yes" : "No"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                ></List.Item.Detail>
              }
              actions={
                <ActionPanel>
                  <Action.Push title="View Events" icon={Icon.Eye} target={<ListEvents calendarId={item.id} />} />
                  <Action
                    title="Logout"
                    onAction={async () => {
                      if (await confirmAlert({ title: "Are you sure?" })) {
                        google.logout();
                        popToRoot();
                      }
                    }}
                    icon={Icon.Logout}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                </ActionPanel>
              }
            ></List.Item>
          );
        })}
    </List>
  );
}
