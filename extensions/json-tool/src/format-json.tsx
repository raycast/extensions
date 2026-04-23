import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  JsonOperation,
  JsonPathSuggestion,
  listJsonPathSuggestions,
  transformJson,
} from "./json-tools";
import { readSelectionOrClipboard } from "./input";

const INDENT_OPTIONS = [2, 4, 8];
const ACCENT_COLORS = [Color.Blue, Color.Purple, Color.Magenta];

const OPERATIONS: Array<{
  title: string;
  value: JsonOperation;
  icon: Icon;
  hint: string;
}> = [
  {
    title: "Format",
    value: "format",
    icon: Icon.Text,
    hint: "Pretty-print JSON for reading and editing.",
  },
  {
    title: "Minify",
    value: "minify",
    icon: Icon.MinusCircle,
    hint: "Remove whitespace and output single-line JSON.",
  },
  {
    title: "Repair JSON",
    value: "repair",
    icon: Icon.BandAid,
    hint: "Repair comments, trailing commas, unquoted keys, and single quotes.",
  },
  {
    title: "Escape",
    value: "escape",
    icon: Icon.Code,
    hint: "Convert the current text to a JSON string literal.",
  },
  {
    title: "Unescape",
    value: "unescape",
    icon: Icon.CodeBlock,
    hint: "Convert a JSON string literal back to text or JSON.",
  },
  {
    title: "Encode Unicode",
    value: "unicode-escape",
    icon: Icon.Globe,
    hint: "Convert non-ASCII characters to \\uXXXX.",
  },
  {
    title: "Decode Unicode",
    value: "unicode-unescape",
    icon: Icon.Globe,
    hint: "Convert \\uXXXX sequences back to readable characters.",
  },
  {
    title: "Schema",
    value: "schema",
    icon: Icon.Document,
    hint: "Infer a basic JSON Schema from the current JSON.",
  },
  {
    title: "JSONPath Query",
    value: "path",
    icon: Icon.MagnifyingGlass,
    hint: "Query JSON fragments with user.name or items[0].",
  },
];

type EditingPanel = "path" | "clipboard-history" | undefined;

type ClipboardHistoryItem = {
  offset: number;
  text: string;
  preview: string;
  summary: string;
};

export default function Command() {
  const [content, setContent] = useState("");
  const [source, setSource] = useState<"selection" | "clipboard" | "manual">(
    "manual",
  );
  const [operation, setOperation] = useState<JsonOperation>("format");
  const [indent, setIndent] = useState(2);
  const [path, setPath] = useState("");
  const [sortKeys, setSortKeys] = useState(false);
  const [editingPanel, setEditingPanel] = useState<EditingPanel>();
  const [status, setStatus] = useState("Paste JSON to begin.");
  const [error, setError] = useState<string | undefined>();

  const activeOperation = OPERATIONS.find((item) => item.value === operation);

  useEffect(() => {
    async function loadInitialText() {
      const result = await readSelectionOrClipboard();
      setContent(result.text);
      setSource(result.source);
      setStatus(
        result.text.trim()
          ? `Loaded from ${result.source}.`
          : "Paste JSON to begin.",
      );
    }

    loadInitialText();
  }, []);

  async function runOperation(nextOperation: JsonOperation) {
    if (nextOperation === "path") {
      setOperation("path");
      setEditingPanel("path");
      return;
    }

    if (!content.trim()) {
      setStatus("Paste JSON to begin.");
      setError(undefined);
      return;
    }

    try {
      const result = transformJson(content, {
        operation: nextOperation,
        indent,
        path,
        sortKeys,
      });

      setContent(result.output);
      setOperation(nextOperation);
      setSource("manual");
      setStatus(
        `${
          result.inputKind === "encoded-json-string"
            ? "decoded JSON string"
            : "ready"
        } · ${result.summary}`,
      );
      setError(undefined);
    } catch (error) {
      setStatus("Invalid JSON.");
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyContent() {
    if (!content) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No content",
        message: error,
      });
      return;
    }

    await Clipboard.copy(content);
    await showToast({ style: Toast.Style.Success, title: "Copied content" });
  }

  async function reloadInput() {
    const result = await readSelectionOrClipboard();
    setContent(result.text);
    setSource(result.source);
    setStatus(
      result.text.trim()
        ? `Loaded from ${result.source}.`
        : "Paste JSON to begin.",
    );
    setError(undefined);
    await showToast({
      style: Toast.Style.Success,
      title: `Loaded from ${result.source}`,
    });
  }

  if (editingPanel === "path") {
    return (
      <PathQueryView
        input={content}
        indent={indent}
        path={path}
        onApplyResult={(nextPath, result) => {
          setPath(nextPath);
          setContent(result);
          setOperation("path");
          setSource("manual");
          setStatus(`Path ${nextPath} · result applied`);
          setError(undefined);
        }}
        onClose={() => setEditingPanel(undefined)}
      />
    );
  }

  if (editingPanel === "clipboard-history") {
    return (
      <ClipboardHistoryView
        onSelect={(text, offset) => {
          setContent(text);
          setSource("clipboard");
          setStatus(`Loaded JSON from clipboard history #${offset}.`);
          setError(undefined);
          setEditingPanel(undefined);
        }}
        onClose={() => setEditingPanel(undefined)}
      />
    );
  }

  return (
    <Form
      actions={
        <WorkbenchActions
          content={content}
          error={error}
          operation={operation}
          copyContent={copyContent}
          reloadInput={reloadInput}
          runOperation={runOperation}
          setIndent={setIndent}
          indent={indent}
          setSortKeys={setSortKeys}
          sortKeys={sortKeys}
          openClipboardHistory={() => setEditingPanel("clipboard-history")}
          openPathQuery={() => {
            setOperation("path");
            setEditingPanel("path");
          }}
        />
      }
    >
      <Form.Description
        title="JSON Studio"
        text={`${activeOperation?.title ?? "JSON"} · ${activeOperation?.hint ?? ""} · ⌘⇧V Open JSON Clipboard History`}
      />
      <Form.Dropdown
        id="clipboardHistory"
        title="Clipboard"
        value=""
        onChange={(value) => {
          if (value === "clipboard-history") {
            setEditingPanel("clipboard-history");
          }
        }}
      >
        <Form.Dropdown.Item
          title="JSON Clipboard History"
          value="clipboard-history"
          icon={tintedIcon(Icon.Clock, 1)}
        />
        <Form.Dropdown.Item
          title="Open Recent 6 JSON Items"
          value=""
          icon={tintedIcon(Icon.Bolt, 0)}
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="operation"
        title="Tool"
        value={operation}
        onChange={(value) => setOperation(value as JsonOperation)}
      >
        {OPERATIONS.map((item, index) => (
          <Form.Dropdown.Item
            key={item.value}
            title={item.title}
            value={item.value}
            icon={tintedIcon(item.icon, index)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="indent"
        title="Indent"
        value={String(indent)}
        onChange={(value) => setIndent(Number(value))}
      >
        {INDENT_OPTIONS.map((spaces) => (
          <Form.Dropdown.Item
            key={spaces}
            title={`${spaces} spaces`}
            value={String(spaces)}
            icon={tintedIcon(Icon.TextCursor, spaces)}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="sortKeys"
        label="Sort Keys"
        value={sortKeys}
        onChange={setSortKeys}
      />
      <Form.Separator />
      <Form.TextArea
        id="content"
        title={`JSON · ${activeOperation?.title ?? "Edit"}`}
        value={content}
        onChange={(value) => {
          setContent(value);
          setSource("manual");
          setError(undefined);
          setStatus(
            value.trim()
              ? "Edited. Choose a tool to transform."
              : "Paste JSON to begin.",
          );
        }}
        placeholder='{"name":"Raycast"}'
        error={error}
      />
      <Form.Description
        title="Status"
        text={`${status} · Source ${source} · Indent ${indent} · Sort keys ${
          sortKeys ? "on" : "off"
        }${operation === "path" ? ` · Path ${path || "not selected"}` : ""}`}
      />
    </Form>
  );
}

function WorkbenchActions(props: {
  content: string;
  error?: string;
  operation: JsonOperation;
  copyContent: () => Promise<void>;
  reloadInput: () => Promise<void>;
  runOperation: (operation: JsonOperation) => Promise<void>;
  setIndent: (indent: number) => void;
  indent: number;
  setSortKeys: (sortKeys: boolean) => void;
  sortKeys: boolean;
  primaryOperation?: JsonOperation;
  openClipboardHistory: () => void;
  openPathQuery: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Run Current Tool"
        icon={tintedIcon(Icon.Bolt, 1)}
        onAction={() => props.runOperation(props.operation)}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
      <Action
        title="Format"
        icon={tintedIcon(Icon.Text, 0)}
        onAction={() => props.runOperation("format")}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action
        title="Minify"
        icon={tintedIcon(Icon.MinusCircle, 1)}
        onAction={() => props.runOperation("minify")}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
      <Action
        title="Repair JSON"
        icon={tintedIcon(Icon.BandAid, 2)}
        onAction={() => props.runOperation("repair")}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
      />
      {props.primaryOperation ? (
        <Action
          title={
            props.primaryOperation === "path"
              ? "Open JSONPath Query"
              : "Use This Tool"
          }
          icon={tintedIcon(Icon.Checkmark, 1)}
          onAction={() => {
            if (props.primaryOperation === "path") {
              props.openPathQuery();
              return;
            }

            props.runOperation(props.primaryOperation as JsonOperation);
          }}
        />
      ) : null}
      <Action
        title="Copy Content"
        icon={tintedIcon(Icon.Clipboard, 0)}
        onAction={props.copyContent}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.Push
        title="Preview with Line Numbers"
        icon={tintedIcon(Icon.Eye, 2)}
        target={<CodePreview title="JSON Preview" content={props.content} />}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
      <Action
        title="Reload Selection or Clipboard"
        icon={tintedIcon(Icon.Download, 0)}
        onAction={props.reloadInput}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="JSON Clipboard History"
        icon={tintedIcon(Icon.Clock, 1)}
        onAction={props.openClipboardHistory}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      />

      <ActionPanel.Section title="Tools">
        {OPERATIONS.map((item, index) => (
          <Action
            key={item.value}
            title={item.title}
            icon={tintedIcon(item.icon, index)}
            onAction={() => {
              if (item.value === "path") {
                props.openPathQuery();
                return;
              }

              props.runOperation(item.value);
            }}
          />
        ))}
      </ActionPanel.Section>

      <ActionPanel.Section title="Options">
        {INDENT_OPTIONS.map((spaces) => (
          <Action
            key={spaces}
            title={`Indent ${spaces} Spaces`}
            icon={props.indent === spaces ? Icon.Checkmark : Icon.BlankDocument}
            onAction={() => props.setIndent(spaces)}
          />
        ))}
        <Action
          title={props.sortKeys ? "Disable Sort Keys" : "Enable Sort Keys"}
          icon={props.sortKeys ? Icon.XMarkCircle : Icon.Checkmark}
          onAction={() => props.setSortKeys(!props.sortKeys)}
        />
      </ActionPanel.Section>

      {props.error ? (
        <Action.CopyToClipboard
          title="Copy Error Message"
          content={props.error}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ) : null}
    </ActionPanel>
  );
}

function PathQueryView(props: {
  input: string;
  indent: number;
  path: string;
  onApplyResult: (path: string, result: string) => void;
  onClose: () => void;
}) {
  const [jsonText, setJsonText] = useState(() =>
    formatJsonReference(props.input, props.indent),
  );
  const [searchText, setSearchText] = useState(props.path);
  const suggestions = useMemo(() => {
    try {
      return listJsonPathSuggestions(jsonText);
    } catch {
      return [];
    }
  }, [jsonText]);

  const normalizedSearch = normalizePathInput(searchText);
  const visibleSuggestions = filterPathSuggestions(
    suggestions,
    normalizedSearch,
  );
  const currentPath = normalizedSearch || visibleSuggestions[0]?.path || "";
  const currentResult = buildPathResult(jsonText, currentPath, props.indent);

  async function applyResult(path: string, output: string, error?: string) {
    if (!path || !output || error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "JSONPath Query Failed",
        message: error ?? "Enter a JSONPath.",
      });
      return;
    }

    props.onApplyResult(path, output);
    await showToast({
      style: Toast.Style.Success,
      title: `Applied Path: ${path}`,
    });
    props.onClose();
  }

  async function copyResult(output: string, error?: string) {
    if (!output || error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "JSONPath Query Failed",
        message: error,
      });
      return;
    }

    await Clipboard.copy(output);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Query Result",
    });
  }

  return (
    <List
      isShowingDetail
      navigationTitle="JSONPath Query"
      searchBarPlaceholder="Enter JSONPath, for example nav_menu.home.href"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Current Input">
        <List.Item
          id="current-input"
          title={currentPath || "Enter JSONPath"}
          subtitle={currentResult.error ?? "Query with current input"}
          icon={tintedIcon(Icon.MagnifyingGlass, 0)}
          detail={
            <PathDetail
              jsonText={jsonText}
              path={currentPath}
              output={currentResult.output}
              error={currentResult.error}
              suggestionsCount={suggestions.length}
            />
          }
          actions={
            <PathResultActions
              path={currentPath}
              output={currentResult.output}
              error={currentResult.error}
              jsonText={jsonText}
              setJsonText={setJsonText}
              applyResult={applyResult}
              copyResult={copyResult}
              onClose={props.onClose}
            />
          }
        />
      </List.Section>
      <List.Section title="Suggestions">
        {visibleSuggestions.map((suggestion, index) => {
          const suggestionResult = buildPathResult(
            jsonText,
            suggestion.path,
            props.indent,
          );

          return (
            <List.Item
              key={suggestion.path}
              id={suggestion.path}
              title={suggestion.path}
              subtitle={suggestion.preview}
              icon={tintedIcon(iconForSuggestionType(suggestion.type), index)}
              accessories={[{ text: suggestion.type }]}
              detail={
                <PathDetail
                  jsonText={jsonText}
                  path={suggestion.path}
                  output={suggestionResult.output}
                  error={suggestionResult.error}
                  suggestionsCount={suggestions.length}
                />
              }
              actions={
                <PathResultActions
                  path={suggestion.path}
                  output={suggestionResult.output}
                  error={suggestionResult.error}
                  jsonText={jsonText}
                  setJsonText={setJsonText}
                  applyResult={applyResult}
                  copyResult={copyResult}
                  onClose={props.onClose}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function PathDetail(props: {
  jsonText: string;
  path: string;
  output: string;
  error?: string;
  suggestionsCount: number;
}) {
  return (
    <List.Item.Detail
      markdown={buildPathDetailMarkdown(props)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="JSONPath"
            text={props.path || "Not entered"}
          />
          <List.Item.Detail.Metadata.Label
            title="Suggestions"
            text={`${props.suggestionsCount} paths`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Tip"
            text="No $ prefix required"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PathResultActions(props: {
  path: string;
  output: string;
  error?: string;
  jsonText: string;
  setJsonText: (text: string) => void;
  applyResult: (path: string, output: string, error?: string) => Promise<void>;
  copyResult: (output: string, error?: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Apply Query Result to Main Editor"
        icon={tintedIcon(Icon.Checkmark, 1)}
        onAction={() =>
          props.applyResult(props.path, props.output, props.error)
        }
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
      <Action
        title="Copy Query Result"
        icon={tintedIcon(Icon.Clipboard, 0)}
        onAction={() => props.copyResult(props.output, props.error)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.Paste title="Paste Query Result" content={props.output} />
      <Action.CopyToClipboard title="Copy JSONPath" content={props.path} />
      <Action.Push
        title="Preview Full JSON"
        icon={tintedIcon(Icon.Eye, 2)}
        target={<CodePreview title="Full JSON" content={props.jsonText} />}
      />
      <Action.Push
        title="Preview Query Result"
        icon={tintedIcon(Icon.Eye, 1)}
        target={<CodePreview title="Query Result" content={props.output} />}
      />
      <Action
        title="Format Full JSON"
        icon={tintedIcon(Icon.Text, 0)}
        onAction={() =>
          props.setJsonText(formatJsonReference(props.jsonText, 2))
        }
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action
        title="Back to Workbench"
        icon={Icon.ArrowLeft}
        onAction={props.onClose}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      {props.error ? (
        <Action.CopyToClipboard
          title="Copy Error Message"
          content={props.error}
        />
      ) : null}
    </ActionPanel>
  );
}

function buildPathDetailMarkdown(props: {
  jsonText: string;
  path: string;
  output: string;
  error?: string;
}) {
  const fullJson = formatJsonReference(props.jsonText, 2);

  if (!props.path) {
    return `# JSONPath Query\n\nEnter a path to see matching suggestions on the left.\n\n## Full JSON\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(fullJson))}\n\`\`\``;
  }

  if (props.error) {
    return `# ${props.path}\n\n## Query Error\n\n\`\`\`text\n${escapeCodeFence(props.error)}\n\`\`\`\n\n## Full JSON\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(fullJson))}\n\`\`\``;
  }

  return `# ${props.path}\n\n## Query Result\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(props.output))}\n\`\`\`\n\n## Full JSON\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(fullJson))}\n\`\`\``;
}

function ClipboardHistoryView(props: {
  onSelect: (text: string, offset: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ClipboardHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      setItems(await readJsonClipboardHistory());
      setIsLoading(false);
    }

    loadHistory();
  }, []);

  async function refresh() {
    setIsLoading(true);
    setItems(await readJsonClipboardHistory());
    setIsLoading(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Clipboard History Refreshed",
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="JSON Clipboard History"
      searchBarPlaceholder="Search the most recent 6 Raycast clipboard JSON entries"
    >
      <List.EmptyView
        title="No JSON Found"
        description="Raycast API can only read the 6 most recent clipboard history entries. Copy JSON and refresh again."
        icon={tintedIcon(Icon.Clock, 1)}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <Action
              title="Back to Workbench"
              icon={Icon.ArrowLeft}
              onAction={props.onClose}
            />
          </ActionPanel>
        }
      />
      {items.map((item, index) => (
        <List.Item
          key={`${item.offset}-${item.preview}`}
          title={`History #${item.offset}`}
          subtitle={item.preview}
          icon={tintedIcon(Icon.Clipboard, index)}
          accessories={[{ text: item.summary }]}
          detail={
            <List.Item.Detail
              markdown={`# Clipboard History #${item.offset}\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(formatJsonReference(item.text, 2)))}\n\`\`\``}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Offset"
                    text={String(item.offset)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Summary"
                    text={item.summary}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Source"
                    text="Raycast Clipboard History"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Use This JSON"
                icon={tintedIcon(Icon.Checkmark, index)}
                onAction={() => props.onSelect(item.text, item.offset)}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action
                title="Use Formatted JSON"
                icon={tintedIcon(Icon.Text, index)}
                onAction={() =>
                  props.onSelect(formatJsonReference(item.text, 2), item.offset)
                }
              />
              <Action.CopyToClipboard
                title="Copy This JSON"
                content={item.text}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Back to Workbench"
                icon={Icon.ArrowLeft}
                onAction={props.onClose}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CodePreview(props: { title: string; content: string }) {
  return (
    <Detail
      navigationTitle={props.title}
      markdown={`# ${props.title}\n\n\`\`\`json\n${escapeCodeFence(addLineNumbers(props.content || ""))}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Raw Content"
            content={props.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function tintedIcon(icon: Icon, seed: number) {
  return {
    source: icon,
    tintColor: ACCENT_COLORS[seed % ACCENT_COLORS.length],
  };
}

function formatJsonReference(input: string, indent: number): string {
  try {
    return transformJson(input, {
      operation: "format",
      indent,
    }).output;
  } catch {
    return input;
  }
}

async function readJsonClipboardHistory(): Promise<ClipboardHistoryItem[]> {
  const entries = await Promise.all(
    Array.from({ length: 6 }, async (_, offset) => {
      try {
        const text = await Clipboard.readText({ offset });

        if (!text?.trim()) {
          return undefined;
        }

        const formatted = transformJson(text, {
          operation: "format",
          indent: 2,
        });

        return {
          offset,
          text,
          preview: summarizeClipboardText(text),
          summary: formatted.summary,
        };
      } catch {
        return undefined;
      }
    }),
  );

  const seen = new Set<string>();
  return entries.filter((entry): entry is ClipboardHistoryItem => {
    if (!entry) {
      return false;
    }

    const fingerprint = entry.text.trim();

    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function summarizeClipboardText(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 120);
}

function addLineNumbers(content: string): string {
  const lines = content.split(/\r\n|\r|\n/);
  const width = String(lines.length).length;

  return lines
    .map((line, index) => `${String(index + 1).padStart(width, " ")} │ ${line}`)
    .join("\n");
}

function escapeCodeFence(text: string): string {
  return text.replace(/```/g, "`\\`\\`");
}

function normalizePathInput(path: string): string {
  return path.trim().replace(/^\$\.?/, "");
}

function filterPathSuggestions(
  suggestions: JsonPathSuggestion[],
  searchText: string,
): JsonPathSuggestion[] {
  if (!searchText) {
    return suggestions;
  }

  const query = searchText.toLowerCase();

  return suggestions.filter((suggestion) => {
    const path = suggestion.path.toLowerCase();
    return path.includes(query) || path.endsWith(`.${query}`);
  });
}

function buildPathResult(input: string, path: string, indent: number) {
  if (!path) {
    return {
      output: "",
      error: "Type a field name or choose a path from suggestions.",
    };
  }

  try {
    const result = transformJson(input, {
      operation: "path",
      path,
      indent,
    });

    return {
      output: result.output,
      error: undefined,
    };
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function iconForSuggestionType(type: string): Icon {
  if (type.startsWith("object")) {
    return Icon.Box;
  }

  if (type.startsWith("array")) {
    return Icon.List;
  }

  if (type === "string") {
    return Icon.Text;
  }

  if (type === "number") {
    return Icon.Hashtag;
  }

  if (type === "boolean") {
    return Icon.CheckCircle;
  }

  return Icon.Dot;
}
