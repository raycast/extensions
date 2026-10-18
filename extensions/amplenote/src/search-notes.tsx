import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import ConnectionErrorView, { isConnectionError } from "./components/ConnectionErrorView";
import CreateNoteForm from "./components/CreateNoteForm";
import NoteView from "./components/NoteView";
import TagDropdown, { NoteFilterItems } from "./components/TagDropdown";
import { NoteCopyActions, NoteOpenActions } from "./components/NoteActions";
import { Note, noteTitle, NoteSortOrder } from "./lib/api";
import { cmd } from "./lib/shortcuts";
import { amplenote, isDailyJot } from "./lib/amplenote";
import { reportError } from "./lib/errors";
import { ALL, filterNotesByTag, tagColor, tagFilterValue, useHighlightedTags } from "./lib/tags";

const MAX_ROW_TAGS = 3;

const sortOrders: { value: NoteSortOrder; title: string; section?: string }[] = [
  { value: "opened", title: "Recently Opened" },
  { value: "changed", title: "Recently Changed" },
  { value: "created", title: "Recently Created" },
  { value: "title", title: "Title", section: "By Title" },
];

function sectionTitle(sort: NoteSortOrder): string | undefined {
  const order = sortOrders.find((item) => item.value === sort);
  return order?.section ?? order?.title;
}

function noteIcon(note: Note) {
  if (note.vault) return Icon.Lock;
  if (isDailyJot(note)) return { source: Icon.Calendar, tintColor: Color.Orange };
  if (note.archived) return Icon.Tray;
  if (note.published) return Icon.Globe;
  if (note.shared) return Icon.TwoPeople;
  return Icon.Document;
}

export default function SearchNotes() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences.SearchNotes>();
  const [filter, setFilter] = useState<string>(preferences.defaultFilter || ALL);
  const query = searchText.trim();
  const [sort, setSort] = useState<NoteSortOrder>((preferences.defaultSort as NoteSortOrder) || "opened");
  const notes = usePromise(amplenote.listNotes, [sort], { onError: reportError });
  const tags = usePromise(amplenote.getTags, [], { onError: reportError });
  const search = usePromise(amplenote.searchNotes, [query], { execute: query.length > 0, onError: reportError });
  const { highlighted, isHighlighted, toggle } = useHighlightedTags();

  const error = notes.error ?? tags.error;
  if (error && isConnectionError(error)) {
    return (
      <ConnectionErrorView
        error={error}
        onRetry={() => {
          notes.revalidate();
          tags.revalidate();
        }}
      />
    );
  }

  const source = query ? search.data : notes.data;
  const results = filterNotesByTag(source ?? [], filter);
  const refresh = () => {
    notes.revalidate();
    tags.revalidate();
    if (query) search.revalidate();
  };

  return (
    <List
      isLoading={notes.isLoading || tags.isLoading || (query.length > 0 && search.isLoading)}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search note titles and content"
      searchBarAccessory={
        <TagDropdown
          tags={tags.data}
          highlighted={highlighted}
          value={filter}
          onChange={setFilter}
          allTitle="All Notes"
          topItems={<NoteFilterItems />}
        />
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query ? "No matching notes" : "No notes"}
        description={filter !== ALL ? "Try another tag filter." : undefined}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Note"
              icon={Icon.NewDocument}
              target={<CreateNoteForm name={query} tags={tags.data} />}
            />
          </ActionPanel>
        }
      />
      <List.Section title={query ? "Search Results" : sectionTitle(sort)} subtitle={`${results.length}`}>
        {results.map((note) => {
          const sortedTags = [...note.tags].sort((a, b) => Number(isHighlighted(b)) - Number(isHighlighted(a)));
          const shownTags = sortedTags.slice(0, MAX_ROW_TAGS);
          const changed = note.changed ?? note.updated;
          return (
            <List.Item
              key={note.uuid}
              id={note.uuid}
              title={noteTitle(note)}
              icon={noteIcon(note)}
              accessories={[
                ...shownTags.map((tag) => ({
                  tag: { value: tag, color: tagColor(tag, tags.data) },
                })),
                ...(sortedTags.length > shownTags.length
                  ? [
                      {
                        text: `+${sortedTags.length - shownTags.length}`,
                        tooltip: sortedTags.slice(MAX_ROW_TAGS).join(", "),
                      },
                    ]
                  : []),
                ...(changed ? [{ date: new Date(changed), tooltip: "Last changed" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push title="Show Note" icon={Icon.Eye} target={<NoteView note={note} tags={tags.data} />} />
                    <NoteOpenActions note={note} tags={tags.data} notes={notes.data} />
                  </ActionPanel.Section>
                  {note.tags.length > 0 ? (
                    <ActionPanel.Section>
                      <ActionPanel.Submenu title="Filter by Tag" icon={Icon.Filter} shortcut={cmd("f")}>
                        {note.tags.map((tag) => (
                          <Action
                            key={tag}
                            title={tag}
                            icon={{ source: Icon.Tag, tintColor: tagColor(tag, tags.data) }}
                            onAction={() => setFilter(tagFilterValue(tag))}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <ActionPanel.Submenu title="Highlight Tag" icon={Icon.Star} shortcut={cmd("h")}>
                        {note.tags.map((tag) => (
                          <Action
                            key={tag}
                            title={highlighted.includes(tag) ? `Remove Highlight: ${tag}` : tag}
                            icon={{
                              source: highlighted.includes(tag) ? Icon.StarDisabled : Icon.Star,
                              tintColor: tagColor(tag, tags.data),
                            }}
                            onAction={() => void toggle(tag)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    </ActionPanel.Section>
                  ) : null}
                  <ActionPanel.Section>
                    <NoteCopyActions note={note} />
                    <Action.Push
                      title="Create Note"
                      icon={Icon.NewDocument}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<CreateNoteForm tags={tags.data} onCreated={refresh} />}
                    />
                    <ActionPanel.Submenu title="Sort Notes" icon={Icon.ArrowUp}>
                      {sortOrders.map((order) => (
                        <Action
                          key={order.value}
                          title={order.title}
                          icon={order.value === sort ? Icon.Checkmark : undefined}
                          onAction={() => setSort(order.value)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
