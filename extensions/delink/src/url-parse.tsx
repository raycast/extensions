import { Action, ActionPanel, Clipboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

interface ParsedParam {
  key: string;
  value: string;
  decodedValue: string;
}

interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: ParsedParam[];
}

function parseUrl(rawUrl: string): ParsedUrl | null {
  try {
    const trimmed = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
    const parsed = new URL(trimmed);

    const params: ParsedParam[] = [];
    parsed.searchParams.forEach((value, key) => {
      params.push({
        key,
        value,
        decodedValue: decodeURIComponent(value),
      });
    });

    return {
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      hash: parsed.hash,
      params,
    };
  } catch {
    return null;
  }
}

function tryFormatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function ParamMetadata({ param }: { param: ParsedParam }) {
  const isEncoded = param.value !== param.decodedValue;
  const formattedValue = tryFormatJson(param.decodedValue);
  const isJson = formattedValue !== param.decodedValue;

  const markdownLines = [
    isJson ? `**解码值** *(JSON)*` : `**解码值**`,
    ``,
    isJson ? "```json" : "```",
    formattedValue,
    "```",
  ];

  if (isEncoded) {
    markdownLines.push(``, `**原始值** *(URL 编码)*`, ``, "```", param.value, "```");
  }

  return <List.Item.Detail markdown={markdownLines.join("\n")} />;
}

function UrlInfoMetadata({ parsedUrl }: { parsedUrl: ParsedUrl }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="协议" text={parsedUrl.protocol.replace(":", "")} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="域名" text={parsedUrl.host} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="路径" text={parsedUrl.pathname || "/"} />
          {parsedUrl.hash && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Hash" text={parsedUrl.hash} />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="参数数量" text={String(parsedUrl.params.length)} />
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
    <Action title="从剪贴板粘贴" onAction={onPasteFromClipboard} shortcut={{ modifiers: ["cmd"], key: "v" }} />
  );

  return (
    <List navigationTitle="URL Parser" searchBarPlaceholder="Filter parameters..." isShowingDetail>
      <List.Section title={`${parsedUrl.host}${parsedUrl.pathname || "/"}`}>
        <List.Item
          title="URL 信息"
          accessories={[{ text: `${parsedUrl.params.length} 个参数` }]}
          detail={<UrlInfoMetadata parsedUrl={parsedUrl} />}
          actions={
            <ActionPanel>
              {pasteAction}
              <Action.CopyToClipboard title="复制域名" content={parsedUrl.host} />
              <Action.CopyToClipboard
                title="复制全部参数"
                content={allParamsText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="查询参数">
        {parsedUrl.params.length === 0 ? (
          <List.Item
            title="该 URL 没有查询参数"
            detail={<List.Item.Detail markdown="该 URL 没有查询参数。" />}
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
                    title="复制解码值"
                    content={param.decodedValue}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="复制原始值"
                    content={param.value}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="复制为 Key=Value"
                    content={`${param.key}=${param.decodedValue}`}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="复制全部参数"
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
        await showToast({ style: Toast.Style.Failure, title: "剪贴板为空" });
        return;
      }
      const parsed = parseUrl(clipboardText);
      if (!parsed) {
        await showToast({ style: Toast.Style.Failure, title: "剪贴板中未找到有效的 URL" });
        return;
      }
      setParsedUrl(parsed);
      await showToast({ style: Toast.Style.Success, title: "解析成功", message: parsed.host });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "读取剪贴板失败" });
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
          title="剪贴板中未找到 URL"
          description="复制一个 URL 后按 ⌘V 解析"
          actions={
            <ActionPanel>
              <Action title="从剪贴板粘贴" onAction={pasteFromClipboard} shortcut={{ modifiers: ["cmd"], key: "v" }} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
