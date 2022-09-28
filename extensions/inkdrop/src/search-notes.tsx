import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { DateTime, type DateTimeFormatOptions } from "luxon";
import { useState } from "react";
import { BookMetadata } from "./components/BookMetadata";
import { TagMetadata } from "./components/TagMetadata";
import { getInkdrop, type InkdropOption } from "./inkdrop";

const buildTimeString = (time: number) => {
  const timeFormat: DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  const dateTime = DateTime.fromMillis(time);
  const timeLabel = dateTime.toLocaleString(timeFormat);
  const relativeLabel = dateTime.toRelativeCalendar();
  return `${relativeLabel} / ${timeLabel}`;
};

const Command = () => {
  const [keyword, setKeyword] = useState("");
  const { useNotes } = getInkdrop(getPreferenceValues<InkdropOption>());
  const { notes, isLoading, error } = useNotes(keyword);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot access Inkdrop",
      message: "Check configuration of this extension and Inkdrop app",
    });
  }

  return (
    <List isShowingDetail isLoading={isLoading} onSearchTextChange={setKeyword}>
      {notes?.map((note) => {
        const createdAt = buildTimeString(note.createdAt);
        const updatedAt = buildTimeString(note.updatedAt);
        const notePath = note._id.replace(":", "/");

        return (
          <List.Item
            key={note._id}
            title={note.title}
            icon={Icon.Document}
            detail={
              <List.Item.Detail
                markdown={note.body}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Created" text={createdAt} />
                    <List.Item.Detail.Metadata.Label title="Updated" text={updatedAt} />
                    <BookMetadata note={note} />
                    <TagMetadata note={note} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Open in Inkdrop" target={`inkdrop://${notePath}`} />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView title="No notes found" />
    </List>
  );
};

export default Command;
