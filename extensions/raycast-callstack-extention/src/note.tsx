import { Action, ActionPanel, Color, Icon, List, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { authorize, fetchUpcomingEvents } from "./services/google";
import { newNote } from "./services/notion";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>();

  const { data, isLoading } = usePromise(async () => {
    try {
      await authorize();
      const events = await fetchUpcomingEvents();
      return events;
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }, []);

  const handleCreateNewNote = async () => {
    setIsCreating(true);
    const preferences = getPreferenceValues();
    const selectedEventData = data?.find((item) => item.id === selectedEvent);

    const title = selectedEvent === "new" ? search : selectedEventData?.title ?? "";
    const employees =
      selectedEventData?.attendees?.length && selectedEventData?.attendees?.length <= 3
        ? selectedEventData?.attendees?.filter((a) => a.self !== true)?.map((a) => a.displayName)
        : undefined;

    const response = await newNote(title, preferences.NotionKey, employees);
    if (response?.url) {
      open(response?.url?.replace("https", "notion"));
    }
    setIsCreating(false);
  };

  return (
    <List
      onSearchTextChange={setSearch}
      isLoading={isLoading || isCreating}
      onSelectionChange={(id) => setSelectedEvent(id)}
    >
      {search ? (
        <List.Item
          key="new"
          title={search}
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          id="new"
          actions={
            <ActionPanel>
              <Action title="Create new note" onAction={handleCreateNewNote} />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.map((item) => (
        <List.Item
          key={item.id}
          title={item?.title || ""}
          id={item.id}
          icon={
            isBefore(new Date(item.start), new Date()) && isAfter(new Date(item.end), new Date()) ? Icon.ArrowRight : ""
          }
          actions={
            <ActionPanel>
              <Action title="Create new note" onAction={handleCreateNewNote} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
