import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type TreeNode = {
  id: string;
  key: string;
  value: JsonValue;
  path: Array<string | number>;
  children: TreeNode[];
};

function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

function buildNode(key: string, value: JsonValue, path: Array<string | number> = []): TreeNode {
  const entries: Array<[string, JsonValue, string | number]> = Array.isArray(value)
    ? value.map((item, index) => [`[${index}]`, item, index])
    : value !== null && typeof value === "object"
      ? Object.entries(value).map(([childKey, item]) => [childKey, item, childKey])
      : [];

  return {
    id: path.length === 0 ? "$" : JSON.stringify(path),
    key,
    value,
    path,
    children: entries.map(([childKey, item, segment]) => buildNode(childKey, item, [...path, segment])),
  };
}

function primitiveText(value: JsonPrimitive): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function valuePreview(value: JsonValue): string {
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value !== null && typeof value === "object") return `Object(${Object.keys(value).length})`;
  return primitiveText(value);
}

function jsonPath(path: Array<string | number>): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") return `${result}[${segment}]`;
    return /^[A-Za-z_$][\w$]*$/.test(segment) ? `${result}.${segment}` : `${result}[${JSON.stringify(segment)}]`;
  }, "$");
}

function iconFor(node: TreeNode) {
  if (Array.isArray(node.value)) return { source: Icon.List, tintColor: Color.Purple };
  if (node.value !== null && typeof node.value === "object") {
    return { source: Icon.Folder, tintColor: Color.Yellow };
  }
  if (node.value === null) return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  if (typeof node.value === "string") return { source: Icon.Text, tintColor: Color.Blue };
  if (typeof node.value === "number") return { source: Icon.Hashtag, tintColor: Color.Orange };
  return { source: node.value ? Icon.CheckCircle : Icon.Circle, tintColor: Color.Green };
}

function NodeActions({ node, onReload }: { node: TreeNode; onReload: () => Promise<void> }) {
  const container = isContainer(node.value);
  const subtree = JSON.stringify(node.value, null, 2);
  const copyValue = isContainer(node.value) ? JSON.stringify(node.value) : primitiveText(node.value);

  return (
    <ActionPanel>
      {container ? (
        <Action.Push title="Open" icon={Icon.ArrowRight} target={<JsonLevel node={node} onReload={onReload} />} />
      ) : (
        <Action.CopyToClipboard title="Copy Value" content={copyValue} icon={Icon.Clipboard} />
      )}
      <Action.CopyToClipboard
        title="Copy JSON"
        content={subtree}
        icon={Icon.Code}
        shortcut={container ? { modifiers: ["cmd"], key: "c" } : Keyboard.Shortcut.Common.Copy}
      />
      {container ? (
        <Action.CopyToClipboard
          title="Copy Compact JSON"
          content={JSON.stringify(node.value)}
          icon={Icon.CodeBlock}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy JSONPath"
        content={jsonPath(node.path)}
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
      />
      <ActionPanel.Section>
        <Action
          title="Reload from Clipboard"
          icon={Icon.ArrowClockwise}
          onAction={onReload}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function JsonLevel({ node, onReload }: { node: TreeNode; onReload: () => Promise<void> }) {
  const currentPath = jsonPath(node.path);
  const items = isContainer(node.value) ? node.children : [node];
  const kind = Array.isArray(node.value) ? "array" : "object";

  return (
    <List navigationTitle={currentPath} searchBarPlaceholder={`Search in ${currentPath}…`} filtering>
      {items.length === 0 ? (
        <List.EmptyView
          icon={Array.isArray(node.value) ? Icon.List : Icon.Folder}
          title={`Empty ${kind}`}
          description={currentPath}
        />
      ) : (
        items.map((child) => (
          <List.Item
            id={child.id}
            key={child.id}
            icon={iconFor(child)}
            title={child.key}
            subtitle={valuePreview(child.value)}
            keywords={[child.key, valuePreview(child.value), JSON.stringify(child.value), jsonPath(child.path)]}
            accessories={isContainer(child.value) ? [{ icon: Icon.ChevronRight }, { tag: jsonPath(child.path) }] : []}
            actions={<NodeActions node={child} onReload={onReload} />}
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  const [root, setRoot] = useState<TreeNode>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const readClipboard = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const text = await Clipboard.readText();
      if (!text?.trim()) throw new Error("The clipboard does not contain text.");
      const parsed = JSON.parse(text) as JsonValue;
      setRoot(buildNode("root", parsed));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to read JSON from the clipboard.";
      setRoot(undefined);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Invalid clipboard JSON", message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void readClipboard();
  }, [readClipboard]);

  if (root) return <JsonLevel node={root} onReload={readClipboard} />;

  return (
    <List isLoading={isLoading} navigationTitle="$" searchBarPlaceholder="JSON Tree">
      <List.EmptyView
        icon={Icon.Clipboard}
        title={error ? "Clipboard does not contain valid JSON" : "Copy JSON to the clipboard"}
        description={error ?? "JSON Tree reads the clipboard automatically when opened."}
        actions={
          <ActionPanel>
            <Action title="Read Clipboard Again" icon={Icon.ArrowClockwise} onAction={readClipboard} />
          </ActionPanel>
        }
      />
    </List>
  );
}
