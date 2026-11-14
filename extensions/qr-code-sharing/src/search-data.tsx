import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import os from "os";
import path from "path";
import { useMemo, useState } from "react";
import { CodeDetail } from "./components/code-detail";
import { EntryEditor } from "./components/entry-editor";
import { formatDropdown } from "./components/format-dropdown";
import { codeBoxes, codeMarkdown, renderCode, writeCodeFile } from "./lib/codes";
import { dayKey, formatDateTime, sectionTitle, singleLine } from "./lib/dates";
import { DEFAULT_FORMAT_ID, getFormat } from "./lib/formats";
import { DELETE_SHORTCUT, EDIT_SHORTCUT, PIN_SHORTCUT } from "./lib/shortcuts";
import { CSV_PATH, QRCodeEntry, addEntry, deleteEntry, loadEntries, setPinned } from "./lib/storage";

/** Id of the synthetic row that turns whatever is typed into a new entry. */
const NEW_ITEM_ID = "new-entry";

interface Section {
  key: string;
  title: string;
  entries: QRCodeEntry[];
}

/** Every whitespace-separated term has to appear somewhere in the content. */
function matches(content: string, query: string): boolean {
  const haystack = content.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** Entries are already sorted newest first, so sections come out in the same order. */
function groupByDay(entries: QRCodeEntry[]): Section[] {
  const sections: Section[] = [];
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = dayKey(date);
    const last = sections[sections.length - 1];
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      sections.push({ key, title: sectionTitle(date), entries: [entry] });
    }
  }
  return sections;
}

export default function Command() {
  const { pop } = useNavigation();
  const { data: entries, isLoading, revalidate } = useCachedPromise(loadEntries, [], { initialData: [] });

  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newFormat, setNewFormat] = useState(DEFAULT_FORMAT_ID);
  const trimmed = searchText.trim();

  const sections = useMemo(() => {
    const visible = trimmed ? entries.filter((entry) => matches(entry.content, trimmed)) : entries;
    const pinned = visible.filter((entry) => entry.pinned);
    const rest = groupByDay(visible.filter((entry) => !entry.pinned));
    return pinned.length > 0 ? [{ key: "pinned", title: "Pinned", entries: pinned }, ...rest] : rest;
  }, [entries, trimmed]);

  /** Offer to create unless the exact text is already saved. */
  const canCreate = trimmed.length > 0 && !entries.some((entry) => entry.content === trimmed);
  const hasRows = sections.length > 0 || canCreate;

  const selectedEntry = entries.find((entry) => entry.id === selectedId);
  const previewContent = selectedId === NEW_ITEM_ID ? trimmed : selectedEntry?.content;
  const previewFormat = selectedId === NEW_ITEM_ID ? newFormat : (selectedEntry?.format ?? DEFAULT_FORMAT_ID);
  const { preview: box } = codeBoxes();

  // Only the highlighted row is rendered, so moving through the list regenerates one code.
  const { data: result } = usePromise(
    async (content: string | undefined, format: string, size: typeof box) =>
      content ? renderCode(content, format, size) : undefined,
    [previewContent, previewFormat, box],
  );

  async function create() {
    // Re-validate against the exact values being saved: the cached preview can lag behind
    // the latest keystroke or type change, so it must not be trusted for this check.
    const { error } = await renderCode(trimmed, newFormat, box);
    if (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Cannot encode as ${getFormat(newFormat).title}`,
        message: error,
      });
      return;
    }
    try {
      await addEntry(trimmed, newFormat);
      await showToast({ style: Toast.Style.Success, title: "QR code saved", message: singleLine(trimmed) });
      setSearchText("");
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not save the QR code" });
    }
  }

  async function togglePin(entry: QRCodeEntry) {
    try {
      await setPinned(entry, !entry.pinned);
      revalidate();
      await showToast({ style: Toast.Style.Success, title: entry.pinned ? "Unpinned" : "Pinned to the top" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not change the pin" });
    }
  }

  async function remove(entry: QRCodeEntry, popFirst: boolean) {
    const confirmed = await confirmAlert({
      title: "Delete this QR code?",
      message: singleLine(entry.content),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });
    if (!confirmed) return;
    try {
      await deleteEntry(entry);
      if (popFirst) pop();
      revalidate();
      await showToast({ style: Toast.Style.Success, title: "QR code deleted" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the entry" });
    }
  }

  async function copyImage(content: string, format: string) {
    try {
      const file = await writeCodeFile(content, format, path.join(os.tmpdir(), `code-${Date.now()}.png`));
      await Clipboard.copy({ file });
      await showToast({ style: Toast.Style.Success, title: "Image copied" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy the image" });
    }
  }

  const detailFor = (id: string) => <List.Item.Detail markdown={id === selectedId ? codeMarkdown(result) : ""} />;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      isShowingDetail={hasRows}
      searchBarPlaceholder="Search a code, or type new content to create one…"
      searchBarAccessory={formatDropdown({ tooltip: "Type for new entries", onChange: setNewFormat, storeValue: true })}
    >
      <List.EmptyView
        icon={Icon.BarCode}
        title="No QR codes yet"
        description="Type any text — an email, a number, a link — to create the first one."
      />
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title} subtitle={`${section.entries.length}`}>
          {section.entries.map((entry) => (
            <List.Item
              key={entry.id}
              id={entry.id}
              icon={Icon.BarCode}
              title={singleLine(entry.content)}
              accessories={[{ text: formatDateTime(new Date(entry.createdAt)) }]}
              detail={detailFor(entry.id)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Show Code Full Size"
                      icon={Icon.Eye}
                      target={<CodeDetail entry={entry} onDelete={() => remove(entry, true)} />}
                    />
                    <Action.Push
                      title="Edit Content"
                      icon={Icon.Pencil}
                      shortcut={EDIT_SHORTCUT}
                      target={
                        <EntryEditor
                          entry={entry}
                          onSaved={() => {
                            revalidate();
                            pop();
                          }}
                        />
                      }
                    />
                    <Action.CopyToClipboard title="Copy Text" content={entry.content} />
                    <Action
                      title={entry.pinned ? "Unpin Entry" : "Pin Entry"}
                      icon={entry.pinned ? Icon.PinDisabled : Icon.Pin}
                      shortcut={PIN_SHORTCUT}
                      onAction={() => togglePin(entry)}
                    />
                    <Action
                      title="Copy Image"
                      icon={Icon.Clipboard}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                      onAction={() => copyImage(entry.content, entry.format)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={DELETE_SHORTCUT}
                      onAction={() => remove(entry, false)}
                    />
                    <Action.ShowInFinder
                      title="Show CSV File in Finder"
                      path={CSV_PATH}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {canCreate ? (
        <List.Section title="Create">
          <List.Item
            id={NEW_ITEM_ID}
            icon={Icon.Plus}
            title={singleLine(trimmed)}
            accessories={[{ text: `${getFormat(newFormat).title} · not saved yet` }]}
            detail={detailFor(NEW_ITEM_ID)}
            actions={
              <ActionPanel>
                <Action title="Save Entry" icon={Icon.SaveDocument} onAction={create} />
                <Action
                  title="Copy Image"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={() => copyImage(trimmed, newFormat)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
