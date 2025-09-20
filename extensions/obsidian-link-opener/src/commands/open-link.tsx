import * as React from "react";
import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { NoteWithUrl, CommandProps } from "../types";
import { scanVaultForUrls } from "../services/fileScanner";
import { NoteGrouper } from "../services/noteGrouper";
import open from "open";

export default function Command(props: CommandProps): React.ReactNode {
  const [items, setItems] = React.useState<NoteWithUrl[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const noteGrouper = React.useRef(new NoteGrouper()).current;

  React.useEffect(() => {
    async function loadItems() {
      try {
        const allNotes = await scanVaultForUrls();
        const filteredNotes = props.property
          ? allNotes.filter((note) => note.urlSource === props.property)
          : allNotes;

        // Group and sort notes using frecency
        const groupedNotes = await noteGrouper.groupAndSortNotes(filteredNotes);

        // Expand grouped notes back to individual NoteWithUrl items
        const expandedItems = groupedNotes.flatMap((group) => {
          const originalNote = filteredNotes.find((n) => n.id === group.id);
          if (!originalNote) return [];

          return group.urls.map((urlInfo) => ({
            ...originalNote,
            url: urlInfo.url,
            urlSource: urlInfo.source,
            frecencyScore: group.frecencyScore,
            frecencyBucket: group.frecencyBucket,
          }));
        });

        setItems(expandedItems);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load items",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadItems();
  }, [props.property]);

  const refreshItems = async () => {
    setIsLoading(true);
    try {
      const allNotes = await scanVaultForUrls();
      const filteredNotes = props.property
        ? allNotes.filter((note) => note.urlSource === props.property)
        : allNotes;

      // Group and sort notes using frecency
      const groupedNotes = await noteGrouper.groupAndSortNotes(filteredNotes);

      // Expand grouped notes back to individual NoteWithUrl items
      const expandedItems = groupedNotes.flatMap((group) => {
        const originalNote = filteredNotes.find((n) => n.id === group.id);
        if (!originalNote) return [];

        return group.urls.map((urlInfo) => ({
          ...originalNote,
          url: urlInfo.url,
          urlSource: urlInfo.source,
          frecencyScore: group.frecencyScore,
          frecencyBucket: group.frecencyBucket,
        }));
      });

      setItems(expandedItems);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Link}
          title="No URLs Found"
          description={`No notes with ${
            props.property || "URL"
          } property found`}
        />
      ) : (
        <>
          {items.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              subtitle={item.url}
              accessories={[{ text: item.urlSource, icon: Icon.Link }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={item.url}
                    onOpen={async () => {
                      await noteGrouper.recordNoteUsage(item.id);
                    }}
                  />
                  <Action.CopyToClipboard content={item.url} title="Copy URL" />
                  <Action
                    title="Open URL in Default App"
                    icon={Icon.Globe}
                    onAction={async () => {
                      await noteGrouper.recordNoteUsage(item.id);
                      open(item.url);
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshItems}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
