import { Action, ActionPanel, Clipboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ParsedParam, ParsedUrl, parseUrl, tryFormatJson } from "./utils";

function ParamMetadata({ param }: { param: ParsedParam }) {
  const isEncoded = param.value !== param.decodedValue;
  const formattedValue = tryFormatJson(param.decodedValue);
  const isJson = formattedValue !== param.decodedValue;

  const markdownLines = [
    isJson ? "**Decoded Value** *(JSON)*" : "**Decoded Value**",
    ``,
    isJson ? "```json" : "```",
    formattedValue,
    "```",
  ];

  if (isEncoded) {
    markdownLines.push(``, "**Raw Value** *(URL Encoded)*", ``, "```", param.value, "```");
  }

  return <List.Item.Detail markdown={markdownLines.join("\n")} />;
}

function UrlInfoMetadata({ parsedUrl }: { parsedUrl: ParsedUrl }) {
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface UrlParamListProps {
  parsedUrl: ParsedUrl;
  onPasteFromClipboard: () => void;
}
function UrlParamList({ parsedUrl, onPasteFromClipboard }: UrlParamListProps) {
  const allParamsText = parsedUrl.params.map((p) => `${p.key}=${p.decodedValue}`).join("\n");

  const pasteAction = (
    <Action title="Paste from Clipboard" onAction={onPasteFromClipboard} shortcut={{ modifiers: ["cmd"], key: "v" }} />
  );

  return (
    <List navigationTitle="URL Parser" searchBarPlaceholder="Filter parameters..." isShowingDetail>
      <List.Section title={`${parsedUrl.host}${parsedUrl.pathname || "/"}`}>
        <List.Item
          title="URL Info"
          accessories={[{ text: `${parsedUrl.params.length} params` }]}
          detail={<UrlInfoMetadata parsedUrl={parsedUrl} />}
          actions={
            <ActionPanel>
              {pasteAction}
              <Action.CopyToClipboard title="Copy Host" content={parsedUrl.host} />
              <Action.CopyToClipboard
                title="Copy All Params"
                content={allParamsText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
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
          parsedUrl.params.map((param, index) => (
            <List.Item
              key={`${param.key}-${index}`}
              title={param.key}
              accessories={param.value !== param.decodedValue ? [{ tag: "encoded" }] : []}
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
                    title="Copy All Params"
                    content={allParamsText}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  {pasteAction}
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function pasteFromClipboard() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
        return;
      }
      const parsed = parseUrl(clipboardText);
      if (!parsed) {
        await showToast({ style: Toast.Style.Failure, title: "No valid URL found in clipboard" });
        return;
      }
      setParsedUrl(parsed);
      await showToast({ style: Toast.Style.Success, title: "Parsed successfully", message: parsed.host });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to read clipboard" });
    }
  }

  useEffect(() => {
    async function init() {
      await pasteFromClipboard();
      setIsLoading(false);
    }
    init();
  }, []);

  if (parsedUrl) {
    return <UrlParamList parsedUrl={parsedUrl} onPasteFromClipboard={pasteFromClipboard} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && (
        <List.EmptyView
          title="No URL found in clipboard"
          description="Copy a URL then press ⌘V to parse"
          actions={
            <ActionPanel>
              <Action
                title="Paste from Clipboard"
                onAction={pasteFromClipboard}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
