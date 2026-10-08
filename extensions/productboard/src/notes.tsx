import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import useProductboardPaginated from "./lib/hooks/useProductboardPaginated";
import { Note } from "./lib/types";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import AddNote from "./lib/components/AddNote";

export default function Notes() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: notes, pagination, revalidate } = useProductboardPaginated<Note>("notes");

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search notes"
    >
      {notes.map((note) => {
        const color = note.state === "processed" ? Color.Green : Color.Red;
        return (
          <List.Item
            key={note.id}
            title={note.title}
            icon={{ source: Icon.Dot, tintColor: color }}
            accessories={[{ date: new Date(note.updatedAt) }]}
            detail={
              <List.Item.Detail
                markdown={note.content}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={note.id} />
                    <List.Item.Detail.Metadata.Label title="Title" text={note.title} />
                    <List.Item.Detail.Metadata.TagList title="State">
                      <List.Item.Detail.Metadata.TagList.Item text={note.state} color={color} />
                    </List.Item.Detail.Metadata.TagList>
                    {note.tags.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {note.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Tags" icon={Icon.Minus} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.OpenInBrowser
                  title="Open in Productboard"
                  icon={getFavicon(note.displayUrl, { fallback: "logo.png" })}
                  url={note.displayUrl}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Add Note"
                    shortcut={Keyboard.Shortcut.Common.New}
                    icon={Icon.Plus}
                    target={<AddNote onNoteAdded={revalidate} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
