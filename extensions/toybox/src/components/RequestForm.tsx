import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";

import { HTTP_METHODS, type RequestModel } from "../models/request";
import type { FormEntry, HeaderEntry, HttpMethod, QueryEntry } from "../models/types";
import { toAxiosCode, toCurl, toFetchCode } from "../services/curlExporter";
import { sendRequest } from "../services/http";
import { addFavorite } from "../storage/favoriteStorage";
import { addHistory } from "../storage/historyStorage";
import { prettyJson } from "../utils/json";
import { buildQueryString, parseQueryString } from "../utils/query";
import { getQueryString, setQueryString } from "../utils/url";
import { BodyEditor } from "./BodyEditor";
import { ErrorView } from "./ErrorView";
import { HeaderEditor } from "./HeaderEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import { QueryEditor } from "./QueryEditor";
import { ResponseView } from "./ResponseView";
import { FavoritesView, HistoryView } from "../history/HistoryList";

const TIMEOUT_OPTIONS = [
  { value: "0", title: "不超时" },
  { value: "5000", title: "5 秒" },
  { value: "10000", title: "10 秒" },
  { value: "30000", title: "30 秒" },
  { value: "60000", title: "60 秒" },
];

/**
 * 请求表单：组合 Method / URL / Headers / Query / Body / Timeout / Redirect，
 * 提供 Send 与各类编辑（Headers / Query / 表单 / 收藏 / 复制代码）入口。
 *
 * URL 与 Query 双向同步：编辑 URL 解析其 search 回填 Query；
 * 编辑 Query 重建 URL 的 search。两者始终一致。
 */
export interface RequestFormProps {
  initialRequest: RequestModel;
  importedFromClipboard?: boolean;
  /** 重新解析剪贴板的回调。 */
  onReparse?: () => void;
}

export function RequestForm({ initialRequest, importedFromClipboard, onReparse }: RequestFormProps) {
  const navigation = useNavigation();
  const [request, setRequest] = useState<RequestModel>(initialRequest);
  const [sending, setSending] = useState(false);
  const [showImportBanner, setShowImportBanner] = useState(importedFromClipboard ?? false);

  const patch = (p: Partial<RequestModel>): void => setRequest((r) => ({ ...r, ...p }));

  const onUrlChange = (value: string): void => {
    setRequest((r) => ({ ...r, url: value, query: parseQueryString(getQueryString(value)) }));
  };
  const onQueryChange = (next: QueryEntry[]): void => {
    setRequest((r) => ({ ...r, query: next, url: setQueryString(r.url, buildQueryString(next)) }));
  };
  const onHeadersChange = (next: HeaderEntry[]): void => patch({ headers: next });
  const onFormDataChange = (next: FormEntry[]): void => patch({ formData: next });

  const activeHeaders = request.headers.filter((h) => h.enabled && h.key.trim() !== "").length;
  const activeQuery = request.query.filter((q) => q.enabled && q.key.trim() !== "").length;
  const needsFormEditor = request.bodyType === "formData" || request.bodyType === "urlencoded";

  const onSend = async (): Promise<void> => {
    if (!request.url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "请填写 URL" });
      return;
    }
    setSending(true);
    const result = await sendRequest(request);
    setSending(false);
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

  const onFormatJson = async (): Promise<void> => {
    patch({ body: prettyJson(request.body) });
    await showToast({ style: Toast.Style.Success, title: "JSON 已格式化" });
  };

  const onFavorite = async (): Promise<void> => {
    await addFavorite(request, `${request.method} ${request.url}`);
    await showToast({ style: Toast.Style.Success, title: "已收藏" });
  };

  return (
    <Form
      isLoading={sending}
      actions={
        <ActionPanel>
          <Action title="Send" icon={Icon.Play} onAction={onSend} />
          <Action.Push
            title="编辑 Headers"
            icon={Icon.List}
            target={<HeaderEditor entries={request.headers} onChange={onHeadersChange} />}
          />
          <Action.Push
            title="编辑 Query"
            icon={Icon.List}
            target={<QueryEditor entries={request.query} onChange={onQueryChange} />}
          />
          {needsFormEditor ? (
            <Action.Push
              title="编辑表单数据"
              icon={Icon.List}
              target={
                <KeyValueEditor
                  title="表单字段"
                  keyLabel="字段名"
                  valueLabel="值"
                  entries={request.formData}
                  onChange={onFormDataChange}
                />
              }
            />
          ) : null}
          {request.bodyType === "json" ? (
            <Action
              title="格式化 JSON"
              icon={Icon.Text}
              onAction={onFormatJson}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          ) : null}
          <Action title="收藏请求" icon={Icon.Star} onAction={onFavorite} />
          <Action.Push title="历史记录" icon={Icon.Clock} target={<HistoryView />} />
          <Action.Push
            title="收藏列表"
            icon={Icon.Star}
            target={<FavoritesView onEdit={(req) => navigation.push(<RequestForm initialRequest={req} />)} />}
          />
          <Action.CopyToClipboard
            title="复制 Curl"
            icon={Icon.Terminal}
            content={toCurl(request)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="复制 Fetch 代码" icon={Icon.Code} content={toFetchCode(request)} />
          <Action.CopyToClipboard title="复制 Axios 代码" icon={Icon.Code} content={toAxiosCode(request)} />
          {showImportBanner && onReparse ? (
            <Action title="重新解析剪贴板" icon={Icon.ArrowClockwise} onAction={onReparse} />
          ) : null}
          {showImportBanner ? (
            <Action title="忽略导入提示" icon={Icon.Xmark} onAction={() => setShowImportBanner(false)} />
          ) : null}
        </ActionPanel>
      }
    >
      {showImportBanner ? <Form.Description title="导入" text="✓ 已从剪贴板导入 curl" /> : null}

      <Form.Dropdown
        id="method"
        title="Method"
        value={request.method}
        onChange={(v) => patch({ method: v as HttpMethod })}
      >
        {HTTP_METHODS.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="url"
        title="URL"
        value={request.url}
        onChange={onUrlChange}
        placeholder="https://api.example.com"
      />

      <Form.Description title="Headers" text={`${request.headers.length} 条（${activeHeaders} 启用）`} />
      <Form.Description title="Query" text={`${request.query.length} 条（${activeQuery} 启用）`} />

      <Form.Separator />
      <BodyEditor request={request} onPatch={patch} />

      <Form.Separator />
      <Form.Dropdown
        id="timeout"
        title="Timeout"
        value={String(request.timeout)}
        onChange={(v) => patch({ timeout: Number(v) })}
      >
        {TIMEOUT_OPTIONS.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="followRedirect"
        title="重定向"
        label="跟随重定向"
        value={request.followRedirect}
        onChange={(v) => patch({ followRedirect: v })}
      />
    </Form>
  );
}
