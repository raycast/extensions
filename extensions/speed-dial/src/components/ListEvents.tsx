import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";

import { useEffect, useState } from "react";
import AddRoom from "./AddRoomForm";
import { Event, FetchColorsResponse, MonthRange, Room } from "../types";
import * as google from "../oauth/google";
import { MonthsDropdown } from "./MonthDropdown";
import { detectMeetingApp, isMeetLink, isMeetingLink } from "../utils";
import { RoomProvider } from "../contexts/RoomsContext";

export default function ListEvents({ calendarId }: { calendarId: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<Event[]>([]);
  const [colors, setColors] = useState<FetchColorsResponse>();
  const [monthRange, setMonthRange] = useState<MonthRange>();

  const monthRanges = [
    { id: MonthRange.CURRENT_MONTH, name: "Events from the current month" },
    { id: MonthRange.NEXT_MONTH, name: "Events from next month" },
    { id: MonthRange.LAST_THREE_MONTHS, name: "Events from last three months" },
  ];

  useEffect(() => {
    (async () => {
      if (monthRange && calendarId) {
        setIsLoading(true);
        try {
          await google.authorize();
          const colors = await google.fetchColors();
          const fetchedItems = await google.fetchEvents(calendarId, monthRange);
          const filteredEvents = fetchedItems.filter(
            (event) => isMeetLink(event.hangoutLink || "") || isMeetingLink(event.location)
          );
          setColors(colors);
          setItems(filteredEvents);
          console.log("Loading false");
          setIsLoading(false);
        } catch (error) {
          console.error(error);
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      }
    })();
  }, [calendarId, monthRange]);

  const onDrinkTypeChange = (newValue: string) => {
    setMonthRange(newValue as MonthRange);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search events with meeting links"
      searchBarAccessory={<MonthsDropdown monthRanges={monthRanges} onRangeChange={onDrinkTypeChange} />}
      actions={
        isLoading || items.length > 0 ? null : (
          <ActionPanel>
            <Action.Push title="Add Room" target={<AddRoom />} />
          </ActionPanel>
        )
      }
    >
      {items?.map((item) => {
        return (
          <List.Item
            key={item.id}
            id={item.id}
            icon={{ source: Icon.CircleFilled, tintColor: colors?.event?.[item.colorId]?.background }}
            title={item.summary || "No Title"}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* This can also be moved to the API call */}
                    <List.Item.Detail.Metadata.Label
                      title="Created On"
                      text={new Date(item.created).toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Label title="Organizer" text={item.organizer.email} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Link"
                      text="View in Google Calendar"
                      target={item.htmlLink}
                    />
                  </List.Item.Detail.Metadata>
                }
              ></List.Item.Detail>
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Import Event"
                  target={
                    <RoomProvider>
                      <AddRoom
                        // this can be done when the API call is first made
                        room={((): Room => {
                          const app = detectMeetingApp(item.hangoutLink || item.location);
                          return {
                            name: item.summary || "No Title",
                            url: item.hangoutLink || item.location,
                            app: app.app,
                            icon: app.icon,
                          };
                        })()}
                      />
                    </RoomProvider>
                  }
                />
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
