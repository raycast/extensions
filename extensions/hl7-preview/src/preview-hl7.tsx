import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldDef } from "./definitions";
import { Message, isEmpty, parseHL7 } from "./hl7";
import { HistoryEntry, clearHistory, entryTitle, forget, loadHistory, openEntry, remember, toEntry } from "./history";
import { messageMarkdown, messageType, segmentName } from "./render";
import { Source, readClipboard, readFinderSelection, readSource } from "./sources";

interface Document {
  source: Source;
  message: Message;
}

export default function Command() {
  const { push, pop } = useNavigation();
  // Finder answers only while it is frontmost, so the selection is read once, at launch.
  const { data: finder = [], isLoading: finderLoading } = usePromise(readFinderSelection);
  const { data: history = [], isLoading: historyLoading, revalidate } = usePromise(loadHistory);
  const [searchText, setSearchText] = useState("");
  const previous = useRef("");

  const open = (sources: Source[]) => push(<DocumentView initial={sources} />, revalidate);
  const paste = async () => {
    const source = await readClipboard();
    if (source) open([source]);
    else showToast({ style: Toast.Style.Failure, title: "No HL7 file or message on the clipboard" });
  };
  // Close the picker first, so Esc from the document returns here and not to the form.
  const chooseFile = () =>
    push(
      <PickFile
        onPick={(picked) => {
          pop();
          open(picked);
        }}
      />,
    );
  const showPastViews = () => push(<PastViewsList />, revalidate);

  // ⌘V goes into the search bar. A jump of more than one character is a paste, so the clipboard
  // is read then; typing never reads it.
  const onSearchTextChange = async (text: string) => {
    setSearchText(text);
    const isPaste = text.length - previous.current.length > 1;
    previous.current = text;
    if (!isPaste) return;
    const source = await readClipboard();
    if (!source) return;
    setSearchText("");
    previous.current = "";
    open([source]);
  };

  // The empty view shows two lines at most, so the hints are packed into two.
  const hints = [
    "⌘V paste · ⌘⇧L choose a file",
    [
      `⌘⇧H past views${history.length ? ` (${history.length})` : ""}`,
      finder.length ? `⌘O open ${finder.length === 1 ? finder[0].name : `${finder.length} files`} from Finder` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  ];

  return (
    <List
      isLoading={finderLoading || historyLoading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Paste here…"
    >
      <List.EmptyView
        icon={Icon.Clipboard}
        title="Paste an HL7 file or message"
        description={hints.join("\n")}
        actions={
          <ActionPanel>
            <Action title="Paste File or Message" icon={Icon.Clipboard} onAction={paste} />
            <Action
              title="Past Views"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={showPastViews}
            />
            <Action
              title="Choose File"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={chooseFile}
            />
            {finder.length > 0 && (
              <Action
                title="Open Finder Selection"
                icon={Icon.Finder}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => open(finder)}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Past views, newest first, searchable by patient name, patient ID, date of birth and file name. */
function PastViewsList() {
  const { push } = useNavigation();
  const { data: history = [], isLoading, revalidate } = usePromise(loadHistory);
  // Reload on return, so the view just seen moves to the top.
  const open = (sources: Source[]) => push(<DocumentView initial={sources} />, revalidate);

  return (
    <List isLoading={isLoading} navigationTitle="Past Views" searchBarPlaceholder="Search by patient…">
      {isKeepingPastViews() ? (
        <List.EmptyView icon={Icon.Clock} title="No past views yet" />
      ) : (
        <List.EmptyView
          icon={Icon.Lock}
          title="Past views are off"
          description="Turn on Keep Past Views in the preferences to keep a copy of each message, patient data included, on this Mac."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {history.map((entry) => (
        <List.Item
          key={entry.key}
          title={entryTitle(entry)}
          subtitle={entry.summary}
          keywords={[entry.name, ...entry.patient.split(/[\s,]+/), ...entry.keywords]}
          icon={entry.path ? Icon.Document : Icon.Clipboard}
          accessories={[
            { text: entry.path ? entry.name : "Pasted" },
            { date: new Date(entry.openedAt), tooltip: "Last viewed" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.Eye}
                onAction={async () => {
                  const source = await openEntry(entry);
                  if (source) open([source]);
                  else
                    showToast({
                      style: Toast.Style.Failure,
                      title: "File moved or no longer HL7",
                      message: entry.path,
                    });
                }}
              />
              {entry.path && (
                <Action
                  title="Open Current File"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={async () => {
                    const source = await readSource(entry.path!).catch(() => undefined);
                    if (source) open([source]);
                    else
                      showToast({
                        style: Toast.Style.Failure,
                        title: "File moved or no longer HL7",
                        message: entry.path,
                      });
                  }}
                />
              )}
              {entry.path && <Action.ShowInFinder path={entry.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />}
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  await forget(entry.key);
                  revalidate();
                }}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Clear the history?",
                      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await clearHistory();
                    revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** One or more messages as a single scrolling document. */
function DocumentView({ initial }: { initial: Source[] }) {
  const { push, pop } = useNavigation();
  const [sources, setSources] = useState<Source[]>(initial);
  const [showEmpty, setShowEmpty] = useCachedState("show-empty-fields", false);
  const [showSegments, setShowSegments] = useCachedState("show-segments", true);

  const { data: history = [], revalidate } = usePromise(loadHistory);
  useEffect(() => {
    remember(sources).then(revalidate);
  }, [sources]);

  const documents = useMemo<Document[]>(
    () => sources.flatMap((source) => parseHL7(source.text).map((message) => ({ source, message }))),
    [sources],
  );

  const paste = async () => {
    const source = await readClipboard();
    if (source) setSources([source]);
    else showToast({ style: Toast.Style.Failure, title: "No HL7 file or message on the clipboard" });
  };
  const chooseFile = () =>
    push(
      <PickFile
        onPick={(picked) => {
          setSources(picked);
          pop();
        }}
      />,
    );

  const markdown = documents
    .map(({ source, message }, i) => {
      const label = documents.length > 1 ? `###### ${source.name} · message ${i + 1} of ${documents.length}\n\n` : "";
      return label + messageMarkdown(message, { showEmpty, showSegments });
    })
    .join("\n\n---\n\n");
  const file = sources.length === 1 ? sources[0].path : undefined;

  return (
    <Detail
      navigationTitle={sources.length === 1 ? sources[0].name : `${sources.length} files`}
      markdown={markdown || "No HL7 message found."}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Paste File or Message"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
              onAction={paste}
            />
            <Action
              title="Choose File"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={chooseFile}
            />
            <PastViews history={history} current={sources} onOpen={(source) => setSources([source])} />
          </ActionPanel.Section>
          {documents.length > 0 && (
            <>
              <ActionPanel.Section title="View">
                <Action
                  title={showSegments ? "Hide Segments" : "Show Segments"}
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                  onAction={() => setShowSegments(!showSegments)}
                />
                <Action
                  title={showEmpty ? "Hide Empty Fields" : "Show Empty Fields"}
                  icon={showEmpty ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  onAction={() => setShowEmpty(!showEmpty)}
                />
                <Action.Push
                  title="Show Raw Message"
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  target={<RawMessage messages={documents.map((d) => d.message)} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy Message"
                  content={documents.map((d) => messageText(d.message)).join("\r\r")}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Message as JSON"
                  content={JSON.stringify(
                    documents.map((d) => toJSON(d.message)),
                    null,
                    2,
                  )}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                />
                <CopyField documents={documents} />
              </ActionPanel.Section>
              {file && (
                <ActionPanel.Section>
                  <Action.Open title="Open in Default App" target={file} shortcut={Keyboard.Shortcut.Common.Open} />
                  <Action.ShowInFinder path={file} shortcut={Keyboard.Shortcut.Common.OpenWith} />
                </ActionPanel.Section>
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

/** Earlier views, newest first, searchable by patient name inside the submenu. */
function PastViews(props: { history: HistoryEntry[]; current: Source[]; onOpen: (source: Source) => void }) {
  const { history, current, onOpen } = props;
  const shown = new Set(current.map((source) => toEntry(source).key));
  const entries = history.filter((entry) => !shown.has(entry.key));
  if (entries.length === 0) return null;
  return (
    <ActionPanel.Submenu title="Past Views…" icon={Icon.Clock} shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}>
      {entries.map((entry) => (
        <Action
          key={entry.key}
          title={[entryTitle(entry), entry.summary, entry.path ? entry.name : "Pasted"].filter(Boolean).join(" · ")}
          icon={entry.path ? Icon.Document : Icon.Clipboard}
          onAction={async () => {
            const source = await openEntry(entry);
            if (source) onOpen(source);
            else showToast({ style: Toast.Style.Failure, title: "File moved or no longer HL7", message: entry.path });
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/** Every non-empty field, grouped by segment, searchable inside the submenu. */
function CopyField({ documents }: { documents: Document[] }) {
  return (
    <ActionPanel.Submenu title="Copy Field…" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
      {documents.flatMap(({ message }, m) =>
        message.segments.map((segment, i) => (
          <ActionPanel.Section key={`${m}-${i}`} title={`${segment.name} · ${segmentName(segment)}`}>
            {segment.fields
              .filter((f) => !isEmpty(f))
              .map((f) => {
                const name = fieldDef(segment.name, f.position).name;
                return (
                  <Action.CopyToClipboard
                    key={f.position}
                    title={`${segment.name}-${f.position}${name ? ` ${name}` : ""}`}
                    content={f.raw}
                  />
                );
              })}
          </ActionPanel.Section>
        )),
      )}
    </ActionPanel.Submenu>
  );
}

function PickFile({ onPick }: { onPick: (sources: Source[]) => void }) {
  return (
    <Form
      navigationTitle="Choose HL7 File"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview"
            icon={Icon.Eye}
            onSubmit={async ({ files }: { files: string[] }) => {
              const sources = (await Promise.all(files.map((f) => readSource(f).catch(() => undefined)))).filter(
                (s): s is Source => s !== undefined,
              );
              if (sources.length) onPick(sources);
              else showToast({ style: Toast.Style.Failure, title: "No HL7 message found in the chosen file" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="HL7 File" allowMultipleSelection canChooseDirectories={false} />
      <Form.Description text="Pick one or more files, then press ⌘↵ to preview them." />
    </Form>
  );
}

function messageText(message: Message): string {
  return message.segments.map((s) => s.raw).join("\r");
}

function RawMessage({ messages }: { messages: Message[] }) {
  // Code blocks do not wrap, so long segments (NTE prose) are hard-wrapped with an indent.
  const blocks = messages.map((m) => ["```", ...m.segments.map((s) => wrap(s.raw, 100)), "```"].join("\n"));
  return (
    <Detail
      navigationTitle={messages.map(messageType).join(", ")}
      markdown={blocks.join("\n\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Message" content={messages.map(messageText).join("\r\r")} />
        </ActionPanel>
      }
    />
  );
}

/** Segments as { "OBR-4.2": "…" } maps, skipping empty values. */
function toJSON(message: Message) {
  return message.segments.map((s) => {
    const out: Record<string, string> = { segment: s.name };
    for (const f of s.fields) {
      if (isEmpty(f)) continue;
      f.repetitions.forEach((rep, r) => {
        const id = `${s.name}-${f.position}${f.repetitions.length > 1 ? `[${r + 1}]` : ""}`;
        if (rep.length === 1 && rep[0].length === 1) out[id] = rep[0][0];
        else rep.forEach((comp, c) => comp.join("&") && (out[`${id}.${c + 1}`] = comp.join("&")));
      });
    }
    return out;
  });
}

function wrap(line: string, width: number): string {
  const parts = [line.slice(0, width)];
  for (let i = width; i < line.length; i += width - 4) parts.push(`    ${line.slice(i, i + width - 4)}`);
  return parts.join("\n");
}
