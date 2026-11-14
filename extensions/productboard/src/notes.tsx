import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import useProductboardPaginated from "./lib/hooks/useProductboardPaginated";
import { ConversationPart, Note } from "./lib/types";
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
        const state = note.fields.archived ? "archived" : note.fields.processed ? "processed" : "unprocessed";
        const color = note.fields.archived ? Color.SecondaryText : note.fields.processed ? Color.Green : Color.Red;
        const content = Array.isArray(note.fields.content)
          ? note.fields.content.map(formatConversationPart).join("\n\n")
          : note.fields.content;
        return (
          <List.Item
            key={note.id}
            title={note.fields.name}
            icon={{ source: Icon.Dot, tintColor: color }}
            accessories={[{ date: new Date(note.updatedAt) }]}
            detail={
              <List.Item.Detail
                markdown={content}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={note.id} />
                    <List.Item.Detail.Metadata.Label title="Title" text={note.fields.name} />
                    <List.Item.Detail.Metadata.TagList title="State">
                      <List.Item.Detail.Metadata.TagList.Item text={state} color={color} />
                    </List.Item.Detail.Metadata.TagList>
                    {note.fields.tags?.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {note.fields.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag.id || tag.name} text={tag.name} />
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
                  icon={getFavicon(note.links.html, { fallback: "logo.png" })}
                  url={note.links.html}
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

function formatConversationPart(part: ConversationPart) {
  return part.authorName ? `**${part.authorName}**\n\n${part.content}` : part.content;
}
