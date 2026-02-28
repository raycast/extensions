import { ActionPanel, List, Action, Icon, Color, openExtensionPreferences } from "@raycast/api";

import { type ILocalEntry } from "../Utils/types";
import { OpenFileAction, OpenInBrowserAction } from "../Utils/Actions";
import AddLocalEntryForm from "./AddLocalEntryForm";
import EntryDetails from "../Utils/EntryDetails";

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
        return Icon.Document;
      case "book":
        return Icon.Book;
      case "thesis":
        return Icon.Shield;
      default:
        return Icon.Paperclip;
    }
  };

  const hasFile2Color = (entry: { file?: string }): Color => {
    return entry.file ? Color.PrimaryText : Color.SecondaryText;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search papers by author, year, journal..."
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
      {entries.map((entry, index) => (
        <List.Item
          key={index}
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
          keywords={[...entry.authors, entry.year.toString(), entry.journal || ""]}
          icon={{ source: type2Icon(entry.type), tintColor: hasFile2Color(entry) }}
          actions={
            <ActionPanel>
              <OpenFileAction entry={entry} path={path} />
              <Action.Push
                icon={Icon.BulletPoints}
                title="Show Details"
                target={<EntryDetails entry={entry} path={path} remote={false} />}
              />
              <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy BibTeX" content={entry.bibtex} />
              <OpenInBrowserAction entry={entry} />
              <Action.Push
                icon={Icon.NewDocument}
                title="Add New Entry"
                target={<AddLocalEntryForm path={path} bibfile={bibfile} onAdded={loadEntries} />}
              />
              <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Cog} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
