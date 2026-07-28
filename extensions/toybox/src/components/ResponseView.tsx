import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  environment,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";

import type { RequestModel } from "../models/request";
import type { ResponseModel } from "../models/response";
import { toAxiosCode, toCurl, toFetchCode } from "../services/curlExporter";
import { sendRequest } from "../services/http";
import { addHistory } from "../storage/historyStorage";
import { isImageContentType, isJsonContentType, isPdfContentType, prettyJson } from "../utils/json";
import { formatBytes, formatDuration } from "../utils/url";
import { ErrorView } from "./ErrorView";
import { JsonViewer } from "./JsonViewer";

/**
 * 响应页：顶部展示 Status / Duration / Size / Content-Type，
 * 主体展示 Body（大 body 截断预览），侧栏 Metadata 展示 Headers 与 Cookies。
 *
 * ActionPanel 提供 JSON Viewer、复制（Body/Headers/curl/fetch/axios）、
 * 二进制保存（图片/PDF）与再次发送。
 *
 * **性能**：大响应体不会全量塞进 Detail markdown（否则 Raycast 渲染卡死）。
 * 超过 {@link MAX_BODY_PREVIEW} 的 body 仅截断预览，并引导用户用 JSON Viewer
 * （懒构建树，安全浏览大 JSON）或复制完整 Body。
 */
export interface ResponseViewProps {
  request: RequestModel;
  response: ResponseModel;
}

/** 预览 body 的字符上限，超过则截断以避免 Detail markdown 渲染卡死。 */
const MAX_BODY_PREVIEW = 5000;

export function ResponseView({ request, response }: ResponseViewProps) {
  const navigation = useNavigation();
  const headersText = response.headers.map(([k, v]) => `${k}: ${v}`).join("\n");
  const isJson = isJsonContentType(response.contentType) && response.body.length > 0;
  const isBinary = isImageContentType(response.contentType) || isPdfContentType(response.contentType);

  const resend = async (): Promise<void> => {
    const result = await sendRequest(request);
    if (result.ok) {
      await addHistory(request, {
        status: result.response.status,
        statusText: result.response.statusText,
        duration: result.response.duration,
        size: result.response.size,
        contentType: result.response.contentType,
      });
      navigation.push(<ResponseView request={request} response={result.response} />);
    } else {
      navigation.push(<ErrorView error={result.error} />);
    }
  };

  const saveToFile = async (): Promise<void> => {
    try {
      const ext = isPdfContentType(response.contentType)
        ? "pdf"
        : (response.contentType.split("/")[1]?.split(";")[0] ?? "bin");
      const headers = new Headers();
      for (const h of request.headers) {
        if (h.enabled && h.key.trim() !== "") headers.set(h.key, h.value);
      }
      // 重新下载二进制；仅传 method/headers（图片/PDF 通常为 GET，不带 body）。
      const res = await fetch(request.url, {
        method: request.method,
        headers,
        redirect: request.followRedirect ? "follow" : "manual",
      });
      const buf = Buffer.from(await res.arrayBuffer());
      const filePath = `${environment.supportPath}/response-${Date.now()}.${ext}`;
      await writeFile(filePath, buf);
      await showToast({ style: Toast.Style.Success, title: "已保存", message: filePath });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "保存失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Detail
      markdown={renderBody(response)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="状态" text={`${response.status} ${response.statusText}`} />
          <Detail.Metadata.Label title="耗时" text={formatDuration(response.duration)} />
          <Detail.Metadata.Label title="大小" text={formatBytes(response.size)} />
          <Detail.Metadata.Label title="Content-Type" text={response.contentType || "未知"} />
          <Detail.Metadata.Separator />
          {response.headers.map(([k, v], i) => (
            <Detail.Metadata.Label key={i} title={k} text={v} />
          ))}
          {response.cookies.length > 0 ? <Detail.Metadata.Separator /> : null}
          {response.cookies.map((c, i) => (
            <Detail.Metadata.Label key={i} title={`Cookie · ${c.name}`} text={c.value} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isJson ? (
            <Action.Push title="在 JSON Viewer 中打开" icon={Icon.Text} target={<JsonViewer text={response.body} />} />
          ) : null}
          <Action.CopyToClipboard
            title="复制 Body"
            icon={Icon.Clipboard}
            content={response.body}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard title="复制 Headers" icon={Icon.Clipboard} content={headersText} />
          <Action.CopyToClipboard
            title="复制 Curl"
            icon={Icon.Terminal}
            content={toCurl(request)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="复制 Fetch 代码" icon={Icon.Code} content={toFetchCode(request)} />
          <Action.CopyToClipboard title="复制 Axios 代码" icon={Icon.Code} content={toAxiosCode(request)} />
          {isBinary ? <Action title="保存到文件" icon={Icon.Download} onAction={saveToFile} /> : null}
          <Action title="再次发送" icon={Icon.ArrowClockwise} onAction={resend} />
        </ActionPanel>
      }
    />
  );
}

/** 把内容包裹为 markdown code block（用字符串拼接避免模板字面量嵌套反引号）。 */
function wrapCodeBlock(content: string, lang: string): string {
  return "```" + lang + "\n" + content + "\n```";
}

/**
 * 根据响应类型渲染 Body 的 Markdown。
 *
 * - 图片 / PDF：仅展示元信息与保存提示；
 * - 小 body（≤ {@link MAX_BODY_PREVIEW}）：JSON 格式化后完整显示；
 * - 大 body：截断预览并提示用 JSON Viewer 或复制获取完整内容，避免 Detail 卡死。
 */
function renderBody(response: ResponseModel): string {
  if (isImageContentType(response.contentType)) {
    return (
      "## 图片响应\n\n- **Content-Type**: `" +
      response.contentType +
      "`\n- **大小**: " +
      formatBytes(response.size) +
      "\n\n二进制内容不在文本中展示，可使用「保存到文件」。"
    );
  }
  if (isPdfContentType(response.contentType)) {
    return (
      "## PDF 响应\n\n- **Content-Type**: `" +
      response.contentType +
      "`\n- **大小**: " +
      formatBytes(response.size) +
      "\n\n使用「保存到文件」保存为 PDF。"
    );
  }

  const body = response.body;
  const isJson = isJsonContentType(response.contentType);

  // 小 body：JSON 格式化后若仍不超限则完整显示
  if (body.length <= MAX_BODY_PREVIEW) {
    const content = isJson ? prettyJson(body) : body;
    if (content.length <= MAX_BODY_PREVIEW) {
      return wrapCodeBlock(content, isJson ? "json" : "");
    }
  }

  // 大 body：截断预览 + 提示
  const preview = body.slice(0, MAX_BODY_PREVIEW);
  const hint = isJson
    ? "…（已截断，共 " + formatBytes(response.size) + "；使用「在 JSON Viewer 中打开」浏览完整结构）"
    : "…（已截断，共 " + formatBytes(response.size) + "；复制 Body 获取完整内容）";
  return wrapCodeBlock(preview + "\n\n" + hint, "");
}
