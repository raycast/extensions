import { Action, ActionPanel, Clipboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTranslations } from "./i18n";
import { ParsedParam, ParsedUrl, parseUrl, tryFormatJson } from "./utils";

function ParamMetadata({ param }: { param: ParsedParam }) {
  const t = getTranslations();
  const isEncoded = param.value !== param.decodedValue;
  const formattedValue = tryFormatJson(param.decodedValue);
  const isJson = formattedValue !== param.decodedValue;

  const markdownLines = [
    isJson ? t.decodedValueJson : t.decodedValue,
    ``,
    isJson ? "```json" : "```",
    formattedValue,
    "```",
  ];

  if (isEncoded) {
    markdownLines.push(``, t.rawValue, ``, "```", param.value, "```");
  }

  return <List.Item.Detail markdown={markdownLines.join("\n")} />;
}

function UrlInfoMetadata({ parsedUrl }: { parsedUrl: ParsedUrl }) {
  const t = getTranslations();
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={t.protocol} text={parsedUrl.protocol.replace(":", "")} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={t.host} text={parsedUrl.host} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={t.path} text={parsedUrl.pathname || "/"} />
          {parsedUrl.hash && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Hash" text={parsedUrl.hash} />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={t.paramCount} text={String(parsedUrl.params.length)} />
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
  const t = getTranslations();
  const allParamsText = parsedUrl.params.map((p) => `${p.key}=${p.decodedValue}`).join("\n");

  const pasteAction = (
    <Action title={t.pasteFromClipboard} onAction={onPasteFromClipboard} shortcut={{ modifiers: ["cmd"], key: "v" }} />
  );

  return (
    <List navigationTitle="URL Parser" searchBarPlaceholder="Filter parameters..." isShowingDetail>
      <List.Section title={`${parsedUrl.host}${parsedUrl.pathname || "/"}`}>
        <List.Item
          title={t.urlInfo}
          accessories={[{ text: t.paramsCount(parsedUrl.params.length) }]}
          detail={<UrlInfoMetadata parsedUrl={parsedUrl} />}
          actions={
            <ActionPanel>
              {pasteAction}
              <Action.CopyToClipboard title={t.copyHost} content={parsedUrl.host} />
              <Action.CopyToClipboard
                title={t.copyAllParams}
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
            title={t.noParams}
            detail={<List.Item.Detail markdown={t.noParamsDetail} />}
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
                  <Action.CopyToClipboard
                    title={t.copyDecodedValue}
                    content={param.decodedValue}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title={t.copyRawValue}
                    content={param.value}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title={t.copyKeyValue}
                    content={`${param.key}=${param.decodedValue}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title={t.copyAllParams}
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
  const t = getTranslations();
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function pasteFromClipboard() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({ style: Toast.Style.Failure, title: t.clipboardEmpty });
        return;
      }
      const parsed = parseUrl(clipboardText);
      if (!parsed) {
        await showToast({ style: Toast.Style.Failure, title: t.noValidUrl });
        return;
      }
      setParsedUrl(parsed);
      await showToast({ style: Toast.Style.Success, title: t.parseSuccess, message: parsed.host });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: t.clipboardReadFailed });
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
          title={t.noUrlFound}
          description={t.noUrlDescription}
          actions={
            <ActionPanel>
              <Action
                title={t.pasteFromClipboard}
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
