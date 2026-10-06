import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Clipboard,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { fieldDef } from "./definitions.ts";
import {
  type Message,
  type RawMessage,
  component,
  formatTimestamp,
  isEmpty,
  parseMessage,
  rawText,
  splitHL7,
} from "./hl7.ts";
import {
  type HistoryEntry,
  clearHistory,
  entryKey,
  entryTitle,
  isKeepingPastViews,
  forget,
  loadHistory,
  openEntry,
  remember,
} from "./history.ts";
import { messageMarkdown, messageSummary, messageType, patientOf, segmentName } from "./render.ts";
import { type Source, readClipboard, readFinderSelection, readSource } from "./sources.ts";

const NO_HL7 = "No HL7 file or message on the clipboard";
/** Rows a message list loads per scroll page. */
const PAGE_SIZE = 20;

function fail(title: string, path?: string) {
  return showFailureToast(path, { title, message: path ?? "" });
}

interface Entry {
  source: Source;
  raw: RawMessage;
}

export default function Command() {
  const { push, pop } = useNavigation();
  // Finder answers only while it is frontmost, so the selection is read once, at launch.
  const { data: finder = [], isLoading: finderLoading } = usePromise(readFinderSelection);
  const [searchText, setSearchText] = useState("");
  const previous = useRef("");

  const open = (sources: Source[]) => push(<DocumentView initial={sources} />);
  const paste = async () => {
    const source = await readClipboard();
    if (source) open([source]);
    else fail(NO_HL7);
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
  const showPastViews = () => push(<PastViewsList />);

  // ⌘V lands in the search bar. A jump of >1 char = paste → read the clipboard; typing never does.
  const onSearchTextChange = async (text: string) => {
    setSearchText(text);
    const isPaste = text.length - previous.current.length > 1;
    previous.current = text;
    if (!isPaste) return;
    const source = await readClipboard();
    setSearchText("");
    previous.current = "";
    if (source) open([source]);
    else fail(NO_HL7);
  };

  // The empty view truncates long lines; ⌘K lists the rest.
  const hints = ["⌘V paste", finder.length ? "⌘O open the Finder selection · ⌘K more" : "⌘K more ways in"];

  return (
    <List
      isLoading={finderLoading}
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
                  else fail("File moved or no longer HL7", entry.path);
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
                    else fail("File moved or no longer HL7", entry.path);
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

function DocumentView({ initial }: { initial: Source[] }) {
  const { push, pop } = useNavigation();
  const [sources, setSources] = useState<Source[]>(initial);
  const [showEmpty, setShowEmpty] = useCachedState("show-empty-fields", false);
  const [showSegments, setShowSegments] = useCachedState("show-segments", true);

  const { data: history = [], revalidate } = usePromise(loadHistory);
  useEffect(() => {
    remember(sources).then(revalidate);
  }, [sources]);

  const entries = useMemo<Entry[]>(
    () => sources.flatMap((source) => splitHL7(source.text).map((raw) => ({ source, raw }))),
    [sources],
  );
  const single = useMemo(() => (entries.length === 1 ? parseMessage(entries[0].raw) : undefined), [entries]);

  const paste = async () => {
    const source = await readClipboard();
    if (source) setSources([source]);
    else fail(NO_HL7);
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
  const copy = async (content: string) => {
    await Clipboard.copy(content);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  };
  const file = sources.length === 1 ? sources[0].path : undefined;
  const title = sources.length === 1 ? sources[0].name : `${sources.length} files`;
  const markdown = (message: Message) => messageMarkdown(message, { showEmpty, showSegments });

  const actions = (selected?: { entry: Entry; message: Message }) => (
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
      {selected && (
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
              target={<RawMessage message={selected.message} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Message"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copy(rawText(selected.entry.raw))}
            />
            <Action
              title="Copy Message as JSON"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              onAction={() => copy(JSON.stringify(toJSON(selected.message), null, 2))}
            />
            <CopyField message={selected.message} />
            {entries.length > 1 && (
              <>
                <Action
                  title="Copy All Messages"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
                  onAction={() => copy(entries.map((e) => rawText(e.raw)).join("\r\r"))}
                />
                <Action
                  title="Copy All as JSON"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
                  onAction={() =>
                    copy(
                      JSON.stringify(
                        entries.map((e) => toJSON(parseMessage(e.raw))),
                        null,
                        2,
                      ),
                    )
                  }
                />
              </>
            )}
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
  );

  if (entries.length > 1) return <MessageList entries={entries} title={title} markdown={markdown} actions={actions} />;
  return (
    <Detail
      navigationTitle={title}
      markdown={single ? markdown(single) : "No HL7 message found."}
      actions={actions(single && { entry: entries[0], message: single })}
    />
  );
}

/** A list row: what a message is searched by. Each message is parsed once to build it, then dropped. */
interface Row {
  id: string;
  entry: Entry;
  title: string;
  subtitle: string;
  search: string;
}

/**
 * Several messages, one row each, with the selected one in the detail pane. Rows load a page at a
 * time on scroll; the search covers every message. Only the selected message stays parsed.
 */
function MessageList(props: {
  entries: Entry[];
  title: string;
  markdown: (message: Message) => string;
  actions: (selected?: { entry: Entry; message: Message }) => ReactElement;
}) {
  const { entries, title, markdown, actions } = props;
  const rows = useMemo<Row[]>(
    () =>
      entries.map((entry, i) => {
        const message = parseMessage(entry.raw);
        const patient = patientOf(message);
        const msh = message.segments.find((s) => s.name === "MSH");
        const summary = messageSummary(message);
        const time = formatTimestamp(component(msh, 7)) ?? "";
        return {
          id: String(i),
          entry,
          title: patient.name || "No patient",
          subtitle: summary,
          search: [patient.name, patient.id, patient.born, summary, component(msh, 10), time, entry.source.name]
            .join(" ")
            .toLowerCase(),
        };
      }),
    [entries],
  );
  const [searchText, setSearchText] = useState("");
  const [count, setCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const words = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? rows.filter((r) => words.every((w) => r.search.includes(w))) : rows;
  }, [rows, searchText]);
  const shown = matches.slice(0, count);
  const current = shown.find((r) => r.id === selectedId) ?? shown[0];
  const message = useMemo(() => current && parseMessage(current.entry.raw), [current]);

  return (
    <List
      isShowingDetail
      filtering={false}
      navigationTitle={`${title} · ${entries.length} messages`}
      searchBarPlaceholder="Search by patient, ID, date of birth or type…"
      onSearchTextChange={(text) => {
        setSearchText(text);
        setCount(PAGE_SIZE);
      }}
      onSelectionChange={setSelectedId}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: matches.length > count,
        onLoadMore: () => setCount((c) => c + PAGE_SIZE),
      }}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No matching message" actions={actions()} />
      {shown.map((row) => {
        const selected = row === current && message ? { entry: row.entry, message } : undefined;
        return (
          <List.Item
            key={row.id}
            id={row.id}
            title={row.title}
            subtitle={row.subtitle}
            accessories={[{ text: `#${Number(row.id) + 1}` }]}
            detail={<List.Item.Detail markdown={selected ? markdown(selected.message) : ""} />}
            actions={actions(selected)}
          />
        );
      })}
    </List>
  );
}

/** Earlier views, newest first, searchable by patient name inside the submenu. */
function PastViews(props: { history: HistoryEntry[]; current: Source[]; onOpen: (source: Source) => void }) {
  const { history, current, onOpen } = props;
  const shown = new Set(current.map(entryKey));
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
            else fail("File moved or no longer HL7", entry.path);
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/** Every non-empty field, grouped by segment, searchable inside the submenu. */
function CopyField({ message }: { message: Message }) {
  return (
    <ActionPanel.Submenu title="Copy Field…" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
      {message.segments.map((segment, i) => (
        <ActionPanel.Section key={i} title={`${segment.name} · ${segmentName(segment)}`}>
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
      ))}
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
              else fail("No HL7 message found in the chosen file");
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

function RawMessage({ message }: { message: Message }) {
  // Code blocks do not wrap, so long segments (NTE prose) are hard-wrapped with an indent.
  const block = ["```", ...message.segments.map((s) => wrap(s.raw, 100)), "```"].join("\n");
  return (
    <Detail
      navigationTitle={messageType(message)}
      markdown={block}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Message" content={message.segments.map((s) => s.raw).join("\r")} />
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
