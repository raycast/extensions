import { Action, ActionPanel, Color, List } from "@raycast/api";
import {
  HistoryEntry,
  ParamType,
  ParsedParam,
  ParsedUrl,
  tryDecodeBase64,
  tryFormatJson,
  tryParseTimestamp,
} from "./utils";

// ─── Param type tag config ────────────────────────────────────────────────────

export const PARAM_TYPE_TAG: Record<ParamType, { label: string; color: Color } | null> = {
  json: { label: "JSON", color: Color.Blue },
  base64: { label: "Base64", color: Color.Orange },
  timestamp: { label: "Timestamp", color: Color.Green },
  "url-encoded": { label: "Encoded", color: Color.Yellow },
  plain: null,
};

// ─── ParamMetadata ────────────────────────────────────────────────────────────

export function ParamMetadata({ param }: { param: ParsedParam }) {
  const isEncoded = param.value !== param.decodedValue;
  const formattedValue = tryFormatJson(param.decodedValue);
  const isJson = param.type === "json";
  const base64Decoded = param.type === "base64" ? tryDecodeBase64(param.decodedValue) : null;
  const timestampReadable = param.type === "timestamp" ? tryParseTimestamp(param.decodedValue) : null;

  const markdownLines = [
    isJson ? "**Decoded Value** *(JSON)*" : "**Decoded Value**",
    ``,
    isJson ? "```json" : "```",
    formattedValue,
    "```",
  ];

  if (base64Decoded !== null) {
    markdownLines.push(``, "**Base64 Decoded**", ``, "```", base64Decoded, "```");
  }

  if (timestampReadable !== null) {
    markdownLines.push(``, `**Timestamp** → ${timestampReadable}`);
  }

  if (isEncoded) {
    markdownLines.push(``, "**Raw Value** *(URL Encoded)*", ``, "```", param.value, "```");
  }

  return <List.Item.Detail markdown={markdownLines.join("\n")} />;
}

// ─── UrlInfoMetadata ──────────────────────────────────────────────────────────

export function UrlInfoMetadata({ parsedUrl }: { parsedUrl: ParsedUrl }) {
  const urlLength = parsedUrl.rawUrl.length;
  const urlLengthWarning = urlLength > 2048 ? " ⚠️ exceeds 2048" : "";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Protocol" text={parsedUrl.protocol.replace(":", "")} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Host" text={parsedUrl.host} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Path" text={parsedUrl.pathname || "/"} />
          {parsedUrl.hash && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Hash" text={parsedUrl.hash} />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Param Count" text={String(parsedUrl.params.length)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="URL Length" text={`${urlLength} chars${urlLengthWarning}`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// ─── UrlParamList ─────────────────────────────────────────────────────────────

export interface UrlParamListProps {
  parsedUrl: ParsedUrl;
  onPasteFromClipboard: () => void;
  onShowHistory: () => void;
  onClearHistory: () => void;
}

export function UrlParamList({ parsedUrl, onPasteFromClipboard, onShowHistory, onClearHistory }: UrlParamListProps) {
  // Decoded form: human-readable, suitable for display and debugging.
  // Raw form: preserves percent-encoding, suitable for reconstructing a query string.
  const allParamsDecoded = parsedUrl.params.map((p) => `${p.key}=${p.decodedValue}`).join("\n");
  const allParamsRaw = parsedUrl.params.map((p) => `${p.key}=${p.value}`).join("&");

  const pasteAction = (
    <Action title="Paste from Clipboard" onAction={onPasteFromClipboard} shortcut={{ modifiers: ["cmd"], key: "v" }} />
  );

  const showHistoryAction = (
    <Action title="Show History" onAction={onShowHistory} shortcut={{ modifiers: ["cmd"], key: "h" }} />
  );

  const clearHistoryAction = (
    <Action
      title="Clear History"
      style={Action.Style.Destructive}
      onAction={onClearHistory}
      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
    />
  );

  return (
    <List navigationTitle="URL Parser" searchBarPlaceholder="Filter parameters..." isShowingDetail>
      <List.Section title={`${parsedUrl.host}${parsedUrl.pathname || "/"}`}>
        <List.Item
          title="URL Info"
          accessories={[{ text: `${parsedUrl.params.length} params · ${parsedUrl.rawUrl.length} chars` }]}
          detail={<UrlInfoMetadata parsedUrl={parsedUrl} />}
          actions={
            <ActionPanel>
              {pasteAction}
              <Action.CopyToClipboard title="Copy Host" content={parsedUrl.host} />
              <Action.CopyToClipboard
                title="Copy Full URL"
                content={parsedUrl.rawUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
              <Action.CopyToClipboard
                title="Copy All Params (Decoded)"
                content={allParamsDecoded}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.CopyToClipboard
                title="Copy All Params (Raw)"
                content={allParamsRaw}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              {showHistoryAction}
              {clearHistoryAction}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Query Parameters">
        {parsedUrl.params.length === 0 ? (
          <List.Item
            title="No query parameters"
            detail={<List.Item.Detail markdown="This URL has no query parameters." />}
            actions={<ActionPanel>{pasteAction}</ActionPanel>}
          />
        ) : (
          parsedUrl.params.map((param, index) => {
            const tagConfig = PARAM_TYPE_TAG[param.type];
            const accessories: List.Item.Accessory[] = tagConfig
              ? [{ tag: { value: tagConfig.label, color: tagConfig.color } }]
              : [];

            return (
              <List.Item
                key={`${param.key}-${index}`}
                title={param.key}
                accessories={accessories}
                detail={<ParamMetadata param={param} />}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Decoded Value" content={param.decodedValue} />
                    <Action.CopyToClipboard
                      title="Copy Raw Value"
                      content={param.value}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy as Key=Value"
                      content={`${param.key}=${param.decodedValue}`}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy All Params (Decoded)"
                      content={allParamsDecoded}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy All Params (Raw)"
                      content={allParamsRaw}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    />
                    {pasteAction}
                    {showHistoryAction}
                    {clearHistoryAction}
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}

// ─── HistoryList ──────────────────────────────────────────────────────────────

export interface HistoryListProps {
  history: HistoryEntry[];
  onSelectEntry: (rawUrl: string) => void;
  onPasteFromClipboard?: () => void;
  onClearHistory: () => void;
}

export function HistoryList({ history, onSelectEntry, onPasteFromClipboard, onClearHistory }: HistoryListProps) {
  return (
    <List navigationTitle="URL History" searchBarPlaceholder="Search history..." isShowingDetail>
      <List.EmptyView title="No history yet" description="Parse a URL to start building history" />
      {history.map((entry) => {
        let pathname = "/";
        let protocol = "";
        try {
          const parsed = new URL(entry.rawUrl);
          pathname = parsed.pathname || "/";
          protocol = parsed.protocol.replace(":", "");
        } catch {
          // ignore malformed URLs
        }

        return (
          <List.Item
            key={entry.rawUrl}
            title={entry.host}
            accessories={[]}
            detail={
              <List.Item.Detail
                markdown={["**Full URL**", "", "```", entry.rawUrl, "```"].join("\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Host" text={entry.host} />
                    <List.Item.Detail.Metadata.Separator />
                    {protocol ? <List.Item.Detail.Metadata.Label title="Protocol" text={protocol} /> : null}
                    {protocol ? <List.Item.Detail.Metadata.Separator /> : null}
                    <List.Item.Detail.Metadata.Label title="Path" text={pathname} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="URL Length" text={`${entry.rawUrl.length} chars`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Parse This URL" onAction={() => onSelectEntry(entry.rawUrl)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={entry.rawUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                {onPasteFromClipboard && (
                  <Action
                    title="Paste from Clipboard"
                    onAction={onPasteFromClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                  />
                )}
                <Action
                  title="Clear History"
                  style={Action.Style.Destructive}
                  onAction={onClearHistory}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
