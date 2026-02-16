import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getRecordings, VoiceNote } from "./api/voicenotes";

export default function Command() {
  const [state, setState] = useState<{ isLoading: boolean; data: VoiceNote[] }>(
    {
      isLoading: true,
      data: [],
    },
  );

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getRecordings();
        setState({ isLoading: false, data });
      } catch (error) {
        setState({ isLoading: false, data: [] });
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch recordings",
          message: String(error),
        });
      }
    }
    fetch();
  }, []);

  const [filter, setFilter] = useState("all");

  const tags = Array.from(
    new Set(
      state.data.flatMap((note) =>
        note.tags ? note.tags.map((t) => t.name) : [],
      ),
    ),
  ).sort();
  const filteredNotes =
    filter === "all"
      ? state.data
      : state.data.filter(
          (note) => note.tags && note.tags.some((t) => t.name === filter),
        );

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search your Voicenotes..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Tag"
          storeValue={true}
          onChange={(newValue) => setFilter(newValue)}
        >
          <List.Dropdown.Item title="All Tags" value="all" />
          {tags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredNotes.map((note) => (
        <List.Item
          key={note.id}
          title={note.title || "Untitled Note"}
          subtitle={new Date(note.created_at).toLocaleDateString()}
          accessories={[
            ...(note.tags || []).map((tag) => ({
              tag: { value: tag.name, color: Color.Blue },
              tooltip: tag.name,
            })),
            { text: `${Math.round(note.duration)}s` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://voicenotes.com/notes/${note.id}`}
              />
              <Action.CopyToClipboard
                content={note.transcript}
                title="Copy Transcript"
              />
              <Action.Push
                title="Show Details"
                target={<NoteDetail note={note} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NoteDetail({ note }: { note: VoiceNote }) {
  return (
    <List isShowingDetail>
      <List.Item
        title={note.title}
        detail={
          <List.Item.Detail
            markdown={note.transcript}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(note.created_at).toLocaleString()}
                />
                <List.Item.Detail.Metadata.Label
                  title="Duration"
                  text={`${note.duration}s`}
                />
                {note.tags && note.tags.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {note.tags.map((tag) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={tag.name}
                        text={tag.name}
                        color={Color.Blue}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={`https://voicenotes.com/notes/${note.id}`}
            />
            <Action.CopyToClipboard
              content={note.transcript}
              title="Copy Transcript"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
