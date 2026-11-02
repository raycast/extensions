import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { targetPath, writeJson } from "./export";
import {
  MAX_GENERATED_BYTES,
  MAX_INPUT_BYTES,
  escapeJson,
  parseDocument,
  stats,
  unescapeJson,
  type JsonDocument,
} from "./json";
import { searchText, type SearchResult } from "./search";
import { allTreeItems, visibleTreeItems, type TreeItem } from "./tree";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function report(error: unknown) {
  void showToast({
    style: Toast.Style.Failure,
    title: "Unable to process input",
    message: message(error),
  });
}
function codeBlock(value: string): string {
  let longest = 2;
  for (const match of value.matchAll(/`+/g))
    longest = Math.max(longest, match[0].length);
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${value}\n${fence}`;
}
function countLabel(value: string): string {
  const s = stats(value);
  return `${s.lines} lines · ${s.characters} characters`;
}

export default function Command() {
  const [source, setSource] = useState("");
  const [error, setError] = useState<string>();
  const { push } = useNavigation();
  function run(fn: () => void) {
    try {
      setError(undefined);
      fn();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Format and View"
            icon={Icon.Eye}
            onAction={() =>
              run(() => push(<Result document={parseDocument(source)} />))
            }
          />
          <Action
            title="Search Input with Regular Expression"
            icon={Icon.MagnifyingGlass}
            onAction={() => push(<RegexForm source={source} />)}
          />
          <Action
            title="Read Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              try {
                const value = await Clipboard.readText();
                if (value === undefined)
                  throw new Error("Clipboard has no text");
                setSource(value);
                setError(undefined);
              } catch (e) {
                report(e);
              }
            }}
          />
          <Action
            title="Escape JSON"
            icon={Icon.CodeBlock}
            onAction={() =>
              run(() =>
                push(
                  <TextResult
                    title="Escaped JSON String"
                    value={escapeJson(source)}
                  />,
                ),
              )
            }
          />
          <Action
            title="Unescape JSON String"
            icon={Icon.Text}
            onAction={() =>
              run(() =>
                push(
                  <TextResult
                    title="Unescaped Text"
                    value={unescapeJson(source)}
                  />,
                ),
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="JSON"
        placeholder="Paste JSON or a complete JSON string"
        value={source}
        onChange={(v) => {
          setSource(v);
          setError(undefined);
        }}
        error={error}
      />
      <Form.Description text={countLabel(source)} />
    </Form>
  );
}

function TextResult({ title, value }: { title: string; value: string }) {
  return (
    <Detail
      navigationTitle={title}
      markdown={codeBlock(value)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Text" text={countLabel(value)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={value} />
          <Action.Push
            title="Search Text"
            icon={Icon.MagnifyingGlass}
            target={
              <RegexForm source={value} sourceLimit={MAX_GENERATED_BYTES} />
            }
          />
        </ActionPanel>
      }
    />
  );
}

function Result({ document }: { document: JsonDocument }) {
  return (
    <Detail
      navigationTitle="Formatted JSON"
      markdown={codeBlock(document.pretty)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Text"
            text={countLabel(document.pretty)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Formatted JSON"
            content={document.pretty}
          />
          <Action.Push
            title="Browse Structure"
            icon={Icon.List}
            target={<TreeView document={document} />}
          />
          <Action.Push
            title="Search Text"
            icon={Icon.MagnifyingGlass}
            target={
              <RegexForm
                source={document.pretty}
                original={document.source}
                sourceLimit={MAX_GENERATED_BYTES}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Compact JSON"
            content={document.compact}
          />
          <Action.Push
            title="Export JSON"
            icon={Icon.Download}
            target={<ExportForm document={document} />}
          />
        </ActionPanel>
      }
    />
  );
}

function TreeView({ document }: { document: JsonDocument }) {
  const [expanded, setExpanded] = useState(
    () => new Set([String(document.root.offset)]),
  );
  const [query, setQuery] = useState("");
  const [pageLimit, setPageLimit] = useState(100);
  const all = useMemo(() => allTreeItems(document.root), [document.root]);
  const pointerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of all)
      counts.set(item.pointer, (counts.get(item.pointer) ?? 0) + 1);
    return counts;
  }, [all]);
  const items = useMemo(
    () =>
      query
        ? all.filter((item) =>
            `${item.label} ${item.pointer} ${document.source.slice(item.node.offset, item.node.offset + (item.container ? 0 : item.node.length))}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
        : visibleTreeItems(all, expanded),
    [all, query, document.source, expanded],
  );
  function toggle(item: TreeItem) {
    const next = new Set(expanded);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    setExpanded(next);
    setPageLimit(100);
  }
  return (
    <List
      pagination={{
        pageSize: 100,
        hasMore: pageLimit < items.length,
        onLoadMore: () => setPageLimit((current) => current + 100),
      }}
      navigationTitle="JSON Structure"
      searchBarPlaceholder="Search keys, values, or paths"
      filtering={false}
      onSearchTextChange={(text) => {
        setQuery(text);
        setPageLimit(100);
      }}
    >
      {items.slice(0, pageLimit).map((item) => {
        const raw = document.source.slice(
          item.node.offset,
          item.node.offset + item.node.length,
        );
        const description = item.container
          ? `${item.node.type} · ${item.node.children?.length ?? 0} items`
          : `${item.node.type} · ${raw.slice(0, 200)}`;
        return (
          <List.Item
            key={item.id}
            title={`${"  ".repeat(Math.min(item.depth, 12))}${item.container ? (expanded.has(item.id) ? "▾ " : "▸ ") : ""}${item.label || '""'}`}
            subtitle={description}
            accessories={[
              {
                text: `${item.pointer || "(root)"}${(pointerCounts.get(item.pointer) ?? 0) > 1 ? " · duplicate path" : ""}`,
              },
            ]}
            actions={
              <ActionPanel>
                {item.container ? (
                  <Action
                    title={expanded.has(item.id) ? "Collapse" : "Expand"}
                    icon={
                      expanded.has(item.id)
                        ? Icon.ChevronDown
                        : Icon.ChevronRight
                    }
                    onAction={() => toggle(item)}
                  />
                ) : (
                  <Action.CopyToClipboard
                    title="Copy JSON Value"
                    content={raw}
                  />
                )}
                <Action.Push
                  title="View Node"
                  icon={Icon.Eye}
                  target={
                    <TextResult title={item.pointer || "Root"} value={raw} />
                  }
                />
                {item.container && (
                  <Action.CopyToClipboard
                    title="Copy JSON Value"
                    content={raw}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy JSON Pointer"
                  content={item.pointer}
                />
                <Action
                  title="Expand All"
                  icon={Icon.ArrowDown}
                  onAction={() =>
                    setExpanded(
                      new Set(all.filter((x) => x.container).map((x) => x.id)),
                    )
                  }
                />
                <Action
                  title="Collapse All"
                  icon={Icon.ArrowUp}
                  onAction={() => setExpanded(new Set())}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function RegexForm({
  source,
  original,
  sourceLimit = MAX_INPUT_BYTES,
}: {
  source: string;
  original?: string;
  sourceLimit?: number;
}) {
  const { push } = useNavigation();
  const [pattern, setPattern] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [target, setTarget] = useState("current");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  async function search() {
    setLoading(true);
    setError(undefined);
    try {
      const text =
        target === "original" && original !== undefined ? original : source;
      const result = await searchText(
        text,
        pattern,
        ignoreCase,
        1000,
        500,
        target === "original" ? MAX_INPUT_BYTES : sourceLimit,
      );
      push(<Matches result={result} />);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <Form
      navigationTitle="Search Text"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action title="Search" onAction={search} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="pattern"
        title="Regular Expression"
        placeholder="Enter a JavaScript regular expression"
        value={pattern}
        onChange={(value) => {
          setPattern(value);
          setError(undefined);
        }}
        error={error}
      />
      <Form.Checkbox
        id="ignore-case"
        label="Ignore case"
        value={ignoreCase}
        onChange={setIgnoreCase}
      />
      {original !== undefined && (
        <Form.Dropdown
          id="target"
          title="Search In"
          value={target}
          onChange={setTarget}
        >
          <Form.Dropdown.Item value="current" title="Formatted Text" />
          <Form.Dropdown.Item value="original" title="Original Input" />
        </Form.Dropdown>
      )}
    </Form>
  );
}

function Matches({ result }: { result: SearchResult }) {
  return (
    <List
      navigationTitle={
        result.truncated
          ? `${result.matches.length}+ matches (limit reached)`
          : `${result.matches.length} matches`
      }
      searchBarPlaceholder="Filter matches"
    >
      {result.matches.map((item, index) => (
        <List.Item
          key={index}
          title={`${item.line}:${item.column} · ${item.text ? item.text.slice(0, 120) : "(empty match)"}`}
          subtitle={item.excerpt}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Match Context"
                icon={Icon.Eye}
                target={
                  <TextResult
                    title={`Line ${item.line}`}
                    value={item.excerpt}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Match" content={item.text} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ExportForm({ document }: { document: JsonDocument }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  async function save(values: {
    folder: string[];
    name: string;
    format: string;
  }) {
    try {
      const path = targetPath(values.folder?.[0], values.name);
      setBusy(true);
      const data =
        values.format === "compact" ? document.compact : document.pretty;
      try {
        await writeJson(path, data, false);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        const accepted = await confirmAlert({
          title: "Replace Existing File?",
          message: values.name,
          primaryAction: {
            title: "Replace",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!accepted) return;
        await writeJson(path, data, true);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "JSON exported",
        message: values.name,
      });
      pop();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      navigationTitle="Export JSON"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export JSON" onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="name"
        title="File Name"
        defaultValue="data.json"
        placeholder="data.json"
      />
      <Form.Dropdown id="format" title="Format" defaultValue="pretty">
        <Form.Dropdown.Item value="pretty" title="Formatted" />
        <Form.Dropdown.Item value="compact" title="Compact" />
      </Form.Dropdown>
    </Form>
  );
}
