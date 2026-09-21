import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import type { Keyboard } from "@raycast/api";
import {
  compactJson,
  createChildPager,
  createJsonNode,
  formatJson,
  isContainer,
  JsonNode,
  JsonType,
  jsonPreview,
  jsonPathPreview,
  PAGE_SIZE,
  searchNodes,
  serializeJsonString,
  summarizeJson,
  truncateLabel,
} from "../jsonTools";
import { InputSource, JsonDocument, readDocument } from "../document";
import { readDraft, saveDraft } from "../draft";
import InputForm from "./InputForm";
import NavigationBoundary from "./NavigationBoundary";
import type { WorkspaceNavigation } from "../workspaceNavigation";

type TypeFilter = "all" | JsonType;
const FILTERS: { value: TypeFilter; title: string }[] = [
  { value: "all", title: "All Types" },
  { value: "object", title: "Objects" },
  { value: "array", title: "Arrays" },
  { value: "string", title: "Strings" },
  { value: "number", title: "Numbers" },
  { value: "boolean", title: "Booleans" },
  { value: "null", title: "Null" },
];
const ICONS: Record<JsonType, Icon> = {
  object: Icon.Box,
  array: Icon.BulletPoints,
  string: Icon.QuotationMarks,
  number: Icon.Number00,
  boolean: Icon.CheckCircle,
  null: Icon.MinusCircle,
};

interface Props {
  document: JsonDocument;
  scope?: JsonNode;
  navigation: WorkspaceNavigation;
}

export default function JsonBrowser({ document, scope, navigation }: Props) {
  const { push, pop } = useNavigation();
  const current = useMemo(() => scope ?? createJsonNode(document.value), [scope, document]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(current.id);
  const [showMetadata, setShowMetadata] = useState(getPreferenceValues<Preferences.BetterJson>().showMetadata);
  const [isLoading, setIsLoading] = useState(false);
  const requestVersion = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      requestVersion.current++;
    };
  }, []);
  useEffect(() => {
    // Reset the existing controlled List rather than remounting it: Raycast v2
    // can retain native search text when a new List starts with an empty value.
    requestVersion.current++;
    setQuery("");
    setTypeFilter("all");
    setVisibleCount(PAGE_SIZE);
    setSelectedId(current.id);
  }, [document, current.id]);

  const searching = query.trim().length > 0 || typeFilter !== "all";
  const matches = useMemo(
    () => (searching ? searchNodes(document.tree, query, typeFilter) : []),
    [document, query, typeFilter, searching],
  );
  const childPager = useMemo(() => createChildPager(current), [current]);
  const children = useMemo(() => (searching ? [] : childPager(visibleCount)), [childPager, visibleCount, searching]);
  const nodes = searching ? matches.slice(0, visibleCount) : [current, ...children];
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const limitedSearch = document.tree.truncated
    ? `Search is partial (${document.tree.nodes.length.toLocaleString()} nodes indexed). Long fields and text may be shortened. Browse levels to reach the rest.`
    : "";

  function clearSearch() {
    setQuery("");
    setTypeFilter("all");
    setVisibleCount(PAGE_SIZE);
    setSelectedId(current.id);
  }

  function enter(node: JsonNode) {
    requestVersion.current++;
    setSelectedId(node.id);
    const id = navigation.addRoute();
    push(
      <NavigationBoundary navigation={navigation} id={id}>
        <JsonBrowser document={document} scope={node} navigation={navigation} />
      </NavigationBoundary>,
      () => queueMicrotask(() => navigation.didPop(id)),
    );
  }

  function edit(source: string, inputSource: InputSource, error?: string) {
    requestVersion.current++;
    const id = navigation.addRoute();
    push(
      <NavigationBoundary navigation={navigation} id={id}>
        <InputForm
          initialSource={source}
          inputSource={inputSource}
          initialError={error}
          onAccept={navigation.replace}
        />
      </NavigationBoundary>,
      () => queueMicrotask(() => navigation.didPop(id)),
    );
  }

  async function editInput() {
    const request = ++requestVersion.current;
    try {
      const draft = await readDraft();
      if (!active.current || request !== requestVersion.current) return;
      edit(draft?.trim() ? draft : document.source, draft?.trim() ? "Restored Draft" : document.inputSource);
    } catch {
      if (active.current && request === requestVersion.current) edit(document.source, document.inputSource);
    }
  }

  async function readClipboard() {
    const request = ++requestVersion.current;
    setIsLoading(true);
    try {
      const source = await Clipboard.readText();
      if (!active.current || request !== requestVersion.current) return;
      if (!source?.trim()) {
        await showToast(Toast.Style.Failure, "Clipboard Is Empty", "The current document has been kept.");
        return;
      }
      const parsed = readDocument(source, "Clipboard");
      if (!parsed.ok) {
        edit(source, "Clipboard", parsed.error);
        return;
      }
      await saveDraft("");
      if (active.current && request === requestVersion.current) navigation.replace(parsed.document);
    } catch {
      if (active.current && request === requestVersion.current)
        await showToast(
          Toast.Style.Failure,
          "Could Not Read Clipboard",
          "The current document has been kept. You can also use New Input.",
        );
    } finally {
      if (active.current) setIsLoading(false);
    }
  }

  function toggleNestedStrings() {
    requestVersion.current++;
    const result = readDocument(document.source, document.inputSource, !document.parseNestedStrings);
    if (!result.ok) {
      void showToast(Toast.Style.Failure, "Could Not Convert JSON", result.error);
      return;
    }
    navigation.replace(result.document);
    void showToast(
      Toast.Style.Success,
      result.document.parseNestedStrings ? "Nested JSON Converted" : "Original Types Restored",
      result.document.parseNestedStrings
        ? `${result.document.nestedStringCount} nested ${result.document.nestedStringCount === 1 ? "string" : "strings"} converted. Original input is kept.`
        : "Copied JSON now uses the original data types.",
    );
  }

  const documentActions = (
    <ActionPanel.Section title="Document">
      {selected?.path !== "$" && (
        <CopyAction
          title="Copy Entire Document"
          value={document.value}
          scope="Entire Document ($)"
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
      <Action title="Edit Input" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} onAction={editInput} />
      <Action
        title="Read Clipboard"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={readClipboard}
      />
      <Action
        title="New Input"
        icon={Icon.NewDocument}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => edit("", "Manual Input")}
      />
    </ActionPanel.Section>
  );

  function actions(node?: JsonNode) {
    const canEnter = node && isContainer(node) && (searching || node.id !== current.id);
    return (
      <ActionPanel title={truncateLabel(node?.path ?? "Document")}>
        <ActionPanel.Section>
          {canEnter && (
            <Action
              title={`Enter ${node.path === "$" ? "Document" : truncateLabel(node.key)}`}
              icon={Icon.ArrowRight}
              onAction={() => enter(node)}
            />
          )}
          {node && (
            <CopyAction
              title={node.path === "$" ? "Copy Entire Document" : "Copy Current Content"}
              value={node.value}
              scope={node.path === "$" ? "Entire Document ($)" : node.path}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {!node && <Action title="Clear Search and Filters" icon={Icon.MagnifyingGlass} onAction={clearSearch} />}
          {node && (
            <CopyAction
              title="Copy Compact JSON"
              value={node.value}
              scope={node.path}
              format="compact"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {node && (
            <ActionPanel.Submenu title="Copy as…" icon={Icon.Clipboard}>
              <CopyAction title="Formatted JSON" value={node.value} scope={node.path} />
              <CopyAction
                title="Serialize JSON (JSON.stringify)"
                value={node.value}
                scope={node.path}
                format="serialized"
                shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
              />
              {node.type === "string" && (
                <CopyAction title="Plain Text (Without Quotes)" value={node.value} scope={node.path} format="text" />
              )}
              <CopyAction
                title="Path"
                value={node.path}
                scope={node.path}
                format="text"
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              <CopyAction
                title="Entire Document as Compact JSON"
                value={document.value}
                scope="Entire Document ($)"
                format="compact"
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
              />
              <CopyAction title="Original Input" value={document.source} scope="Original Input" format="text" />
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
        {documentActions}
        <ActionPanel.Section title="More">
          <Action
            title={document.parseNestedStrings ? "Restore Original Data Types" : "Deserialize All Nested JSON"}
            icon={Icon.Code}
            onAction={toggleNestedStrings}
          />
          <ActionPanel.Submenu title="View Options" icon={Icon.Eye}>
            {scope && <Action title="Back to Previous Level" icon={Icon.ArrowLeft} onAction={pop} />}
            {searching && (
              <Action title="Clear Search and Filters" icon={Icon.MagnifyingGlass} onAction={clearSearch} />
            )}
            <Action
              title={showMetadata ? "Hide Detail Metadata" : "Show Detail Metadata"}
              icon={Icon.Info}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowMetadata((value) => !value)}
            />
            {FILTERS.map((filter, index) => (
              <Action
                key={filter.value}
                title={`Filter ${filter.title}`}
                onAction={() => {
                  setTypeFilter(filter.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                shortcut={{ modifiers: ["ctrl"], key: String(index) as Keyboard.KeyEquivalent }}
              />
            ))}
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={openCommandPreferences}
            />
          </ActionPanel.Submenu>
          {node && (
            <Action
              title={
                node.path === "$" ? "Paste Entire Document to Previous App" : "Paste Current Content to Previous App"
              }
              icon={Icon.TextCursor}
              onAction={async () => {
                try {
                  await Clipboard.paste(formatJson(node.value));
                } catch {
                  await showToast(
                    Toast.Style.Failure,
                    "Could Not Paste",
                    "Your JSON is unchanged. Try copying it instead.",
                  );
                }
              }}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={nodes.length > 0}
      filtering={false}
      navigationTitle={current.path === "$" ? "Inspect JSON" : truncateLabel(current.path)}
      searchText={query}
      onSearchTextChange={(value) => {
        setQuery(value);
        setVisibleCount(PAGE_SIZE);
      }}
      searchBarPlaceholder="Search all fields, values, and paths"
      selectedItemId={selected?.id}
      onSelectionChange={setSelectedId}
      actions={actions()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter the Entire Document"
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value as TypeFilter);
            setVisibleCount(PAGE_SIZE);
          }}
        >
          {FILTERS.map((filter) => (
            <List.Dropdown.Item key={filter.value} title={filter.title} value={filter.value} />
          ))}
        </List.Dropdown>
      }
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: searching ? visibleCount < matches.length : children.length < current.childrenCount,
        onLoadMore: () => setVisibleCount((value) => value + PAGE_SIZE),
      }}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Fields"
        description={limitedSearch || "Clear your search, edit the input, or read another JSON document from Actions."}
        actions={actions()}
      />
      <List.Section
        title={
          searching
            ? `Entire Document · ${matches.length} Matches${document.tree.truncated ? " in Search Index" : ""}`
            : current.path === "$"
              ? "Entire Document"
              : truncateLabel(current.path)
        }
        subtitle={
          searching ? limitedSearch : `${document.inputSource} · ${children.length}/${current.childrenCount} children`
        }
      >
        {nodes.map((node) => (
          <List.Item
            key={node.id}
            id={node.id}
            icon={{ source: ICONS[node.type], tintColor: isContainer(node) ? Color.Blue : Color.SecondaryText }}
            title={
              !searching && node.id === current.id
                ? node.path === "$"
                  ? "Entire Document"
                  : node.type === "array"
                    ? "Current Array"
                    : isContainer(node)
                      ? "Current Object"
                      : "Current Value"
                : truncateLabel(node.key)
            }
            subtitle={searching ? truncateLabel(node.path) : node.preview}
            accessories={
              isContainer(node) && (searching || node.id !== current.id)
                ? [{ icon: Icon.ChevronRight, tooltip: `Enter ${truncateLabel(node.path)}` }]
                : []
            }
            detail={
              <NodeDetail node={node} document={document} showMetadata={showMetadata} searchWarning={limitedSearch} />
            }
            actions={actions(node)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function NodeDetail({
  node,
  document,
  showMetadata,
  searchWarning,
}: {
  node: JsonNode;
  document: JsonDocument;
  showMetadata: boolean;
  searchWarning: string;
}) {
  const preview = useMemo(() => jsonPreview(node.value), [node.value]);
  const mode = document.parseNestedStrings
    ? `Auto-deserialized · ${document.nestedStringCount} ${document.nestedStringCount === 1 ? "conversion" : "conversions"}`
    : "Original data types";
  const path = jsonPathPreview(node.path);
  const heading = node.path === "$" ? "Entire Document" : path.markdown;
  const notes = [
    preview.truncated ? "Preview shortened. Copy includes the complete value." : "",
    path.truncated ? "Path shortened. Copy As → Path includes the complete path." : "",
    searchWarning,
  ]
    .filter(Boolean)
    .join("\n\n");
  const markdown = `### ${heading}\n\n${document.inputSource} · ${mode}\n\n${notes ? notes + "\n\n" : ""}${preview.markdown}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        showMetadata ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Path" text={path.text} />
            <List.Item.Detail.Metadata.Label title="Type" text={node.type} />
            <List.Item.Detail.Metadata.Label title="Children" text={String(node.childrenCount)} />
            <List.Item.Detail.Metadata.Label title="Document" text={summarizeJson(document.value)} />
            <List.Item.Detail.Metadata.Label title="Source" text={document.inputSource} />
            <List.Item.Detail.Metadata.Label
              title="Input"
              text={`${document.source.length.toLocaleString()} characters`}
            />
            <List.Item.Detail.Metadata.Label
              title="Search Index"
              text={`${document.tree.nodes.length.toLocaleString()} nodes${document.tree.truncated ? " (partial)" : ""}`}
            />
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function CopyAction({
  title,
  value,
  scope,
  format = "pretty",
  shortcut,
}: {
  title: string;
  value: unknown;
  scope: string;
  format?: "pretty" | "compact" | "serialized" | "text";
  shortcut?: Keyboard.Shortcut;
}) {
  return (
    <Action
      title={title}
      icon={Icon.Clipboard}
      shortcut={shortcut}
      onAction={async () => {
        try {
          const content =
            format === "compact"
              ? compactJson(value)
              : format === "serialized"
                ? serializeJsonString(value)
                : format === "text"
                  ? String(value)
                  : formatJson(value);
          await Clipboard.copy(content);
          await showToast(
            Toast.Style.Success,
            `Copied ${truncateLabel(scope)}`,
            `${format === "pretty" ? "Formatted JSON" : format === "compact" ? "Compact JSON" : format === "serialized" ? "Serialized JSON" : "Text"} · ${content.length.toLocaleString()} characters`,
          );
        } catch {
          await showToast(Toast.Style.Failure, "Could Not Copy", "Your JSON is unchanged. Try copying again.");
        }
      }}
    />
  );
}
