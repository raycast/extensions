import {
  ActionPanel,
  Alert,
  List,
  Action,
  Icon,
  Color,
  Keyboard,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";

import { type ILocalEntry } from "../Utils/types";
import { Icons } from "../Utils/icons";
import { OpenFileAction, OpenInBrowserAction } from "../Utils/Actions";
import AddLocalEntryForm from "./AddLocalEntryForm";
import EntryDetails from "../Utils/EntryDetails";
import { removeEntryFromLibrary } from "../Utils/remove_from_library";
import { showError } from "../Utils/errors";
import { foldForSearch } from "../Utils/bibtex";

export default function LocalList({
  bibfile,
  path,
  isLoading,
  entries,
  loadEntries,
}: {
  bibfile: string;
  path: string;
  isLoading: boolean;
  entries: ILocalEntry[];
  loadEntries: () => void;
}) {
  const shortAuthors = (authors: string[]): string => {
    if (authors.length > 3) {
      if (authors[0].includes("Collaboration")) {
        return authors[0];
      } else {
        return authors[0] + ", et al.";
      }
    }
    return authors.join(", ");
  };

  const type2Icon = (type: string): Icon => {
    switch (type) {
      case "paper":
        return Icons.Document;
      case "book":
        return Icon.Book;
      case "thesis":
        return Icons.Shield;
      default:
        return Icon.Paperclip;
    }
  };

  const hasFile2Color = (entry: { file?: string }): Color => {
    return entry.file ? Color.PrimaryText : Color.SecondaryText;
  };

  // Raycast's built-in filter matches the whole query against the title and each
  // keyword separately, so "gill granot" finds nothing. Instead, every word of
  // the query must appear somewhere in the entry.
  const [searchText, setSearchText] = useState("");
  const searchIndex = useMemo(
    () =>
      entries.map((entry) =>
        foldForSearch(
          [
            entry.title,
            ...entry.authors,
            entry.year > 0 ? String(entry.year) : "",
            entry.journal ?? "",
            entry.key,
          ].join(" "),
        ),
      ),
    [entries],
  );
  const words = foldForSearch(searchText).split(/\s+/).filter(Boolean);
  const visible = entries.filter((_, i) => words.every((word) => searchIndex[i].includes(word)));

  const deleteEntry = async (entry: ILocalEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete Entry?",
      message: entry.file
        ? `"${entry.title}" will be removed from your .bib file, and its PDF moved to the trash.`
        : `"${entry.title}" will be removed from your .bib file.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting entry…" });
      const { trashedPdf } = await removeEntryFromLibrary({ key: entry.key, file: entry.file, path, bibfile });
      await showToast({
        style: Toast.Style.Success,
        title: "Entry deleted",
        message: trashedPdf ? "PDF moved to the trash" : undefined,
      });
      loadEntries();
    } catch (e) {
      await showError(e, "Could not delete entry");
    }
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search papers by title, author, year, journal…"
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.NewDocument}
            title="Add New Entry"
            target={<AddLocalEntryForm path={path} bibfile={bibfile} onAdded={loadEntries} />}
          />
          <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Cog} />
        </ActionPanel>
      }
    >
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Book}
          title={entries.length === 0 ? "No Papers in Library" : "No Matching Papers"}
          description={
            entries.length === 0
              ? "Add a paper with Add New Entry, or import one with Search ADS."
              : "Try searching by a different author, year, or journal."
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.NewDocument}
                title="Add New Entry"
                target={<AddLocalEntryForm path={path} bibfile={bibfile} onAdded={loadEntries} />}
              />
              <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Cog} />
            </ActionPanel>
          }
        />
      )}
      {visible.map((entry, index) => (
        <List.Item
          key={`${entry.key}-${index}`}
          title={entry.title}
          accessories={[
            {
              text: {
                value: shortAuthors(entry.authors),
                color: Color.Blue,
              },
            },
            {
              text: entry.year > 0 ? entry.year.toString() : "",
              tooltip: entry.journal,
            },
          ]}
          icon={{ source: type2Icon(entry.type), tintColor: hasFile2Color(entry) }}
          actions={
            <ActionPanel>
              <OpenFileAction entry={entry} path={path} />
              <Action.Push
                icon={Icon.BulletPoints}
                title="Show Details"
                target={<EntryDetails entry={entry} path={path} remote={false} />}
              />
              <Action.CopyToClipboard icon={Icons.Clipboard} title="Copy BibTeX" content={entry.bibtex} />
              <OpenInBrowserAction entry={entry} />
              <Action.Push
                icon={Icon.NewDocument}
                title="Add New Entry"
                target={<AddLocalEntryForm path={path} bibfile={bibfile} onAdded={loadEntries} />}
              />
              <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Cog} />
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteEntry(entry)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
