import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";

import type { RequestModel } from "../models/request";
import type { FavoriteModel, HistoryModel } from "../models/response";
import { toCurl } from "../services/curlExporter";
import { sendRequest } from "../services/http";
import { addHistory, clearHistory, deleteHistory, loadHistory } from "../storage/historyStorage";
import { deleteFavorite, loadFavorites } from "../storage/favoriteStorage";
import { formatBytes, formatDuration, parseUrl } from "../utils/url";
import { ErrorView } from "../components/ErrorView";
import { ResponseView } from "../components/ResponseView";

/**
 * 通用请求列表，被历史与收藏视图复用。
 *
 * 每条提供「再次发送」「复制 curl」、可选「编辑」与「删除」；
 * 列表顶部可选「清空全部」。再次发送直接调用 `sendRequest` 并 push 响应页。
 */

/** 列表条目的统一结构，由历史 / 收藏模型映射而来。 */
export interface RequestListItem {
  id: string;
  request: RequestModel;
  createdAt: number;
  /** 副标题，如状态码 · 耗时 · 大小。 */
  subtitle?: string;
}

export interface RequestListProps {
  title: string;
  items: RequestListItem[];
  emptyMessage: string;
  /** 外部加载态（初次读取存储时）。 */
  isLoading?: boolean;
  onDelete: (id: string) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  /** 收藏支持编辑：加载到 RequestForm。 */
  onEdit?: (request: RequestModel) => void;
}

export function RequestList({ title, items, emptyMessage, isLoading, onDelete, onClear, onEdit }: RequestListProps) {
  const navigation = useNavigation();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendAgain = async (item: RequestListItem): Promise<void> => {
    setSendingId(item.id);
    const result = await sendRequest(item.request);
    setSendingId(null);
    if (result.ok) {
      await addHistory(item.request, {
        status: result.response.status,
        statusText: result.response.statusText,
        duration: result.response.duration,
        size: result.response.size,
        contentType: result.response.contentType,
      });
      navigation.push(<ResponseView request={item.request} response={result.response} />);
    } else {
      navigation.push(<ErrorView error={result.error} />);
    }
  };

  return (
    <List isLoading={isLoading || sendingId !== null} searchBarPlaceholder={`搜索${title}…`}>
      {items.length === 0 ? (
        <List.EmptyView title={emptyMessage} icon={Icon.Document} />
      ) : (
        <>
          {onClear ? (
            <List.Section title="操作">
              <List.Item
                icon={Icon.Trash}
                title="清空全部"
                actions={
                  <ActionPanel>
                    <Action title="清空" icon={Icon.Trash} onAction={onClear} style={Action.Style.Destructive} />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
          <List.Section title={`${title}（${items.length}）`}>
            {items.map((item) => (
              <List.Item
                key={item.id}
                icon={methodIcon(item.request.method)}
                title={`${item.request.method} ${urlLabel(item.request.url)}`}
                subtitle={item.subtitle}
                accessories={[{ text: formatTime(item.createdAt) }]}
                actions={
                  <ActionPanel>
                    <Action title="再次发送" icon={Icon.Play} onAction={() => sendAgain(item)} />
                    <Action.CopyToClipboard title="复制 Curl" icon={Icon.Terminal} content={toCurl(item.request)} />
                    {onEdit ? <Action title="编辑" icon={Icon.Pencil} onAction={() => onEdit(item.request)} /> : null}
                    <Action
                      title="删除"
                      icon={Icon.Trash}
                      onAction={() => onDelete(item.id)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

/**
 * 历史记录视图：展示最近 20 条请求，支持再次发送 / 复制 curl / 删除 / 清空。
 * 启动时从 LocalStorage 自动加载。从 HTTP Client 的 Action.Push 进入。
 */
export function HistoryView() {
  const [items, setItems] = useState<HistoryModel[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadHistory().then((h) => {
      setItems(h);
      setLoaded(true);
    });
  }, []);

  const listItems: RequestListItem[] = items.map((h) => ({
    id: h.id,
    request: h.request,
    createdAt: h.createdAt,
    subtitle: `${h.responseSummary.status} · ${formatDuration(h.responseSummary.duration)} · ${formatBytes(h.responseSummary.size)}`,
  }));

  const onDelete = async (id: string): Promise<void> => {
    setItems(await deleteHistory(id));
  };

  const onClear = async (): Promise<void> => {
    await clearHistory();
    setItems([]);
  };

  return (
    <RequestList
      title="历史记录"
      items={listItems}
      emptyMessage="暂无历史记录，发送一个请求试试"
      isLoading={!loaded}
      onDelete={onDelete}
      onClear={onClear}
    />
  );
}

/**
 * 收藏视图：展示已收藏的请求，支持再次发送 / 编辑 / 删除。
 * 启动时从 LocalStorage 自动加载，数量不限。从 HTTP Client 的 Action.Push 进入。
 *
 * `onEdit` 由父组件（RequestForm）传入，避免与 RequestForm 形成循环依赖。
 */
export function FavoritesView({ onEdit }: { onEdit: (request: RequestModel) => void }) {
  const [items, setItems] = useState<FavoriteModel[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFavorites().then((f) => {
      setItems(f);
      setLoaded(true);
    });
  }, []);

  const listItems: RequestListItem[] = items.map((f) => ({
    id: f.id,
    request: f.request,
    createdAt: f.createdAt,
    subtitle: f.title,
  }));

  const onDelete = async (id: string): Promise<void> => {
    setItems(await deleteFavorite(id));
  };

  return (
    <RequestList
      title="收藏"
      items={listItems}
      emptyMessage="暂无收藏，在请求页收藏一个试试"
      isLoading={!loaded}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  );
}

/** 按 HTTP 方法返回带颜色的图标。 */
function methodIcon(method: string): { source: Icon; tintColor: Color } {
  switch (method) {
    case "GET":
      return { source: Icon.ArrowRight, tintColor: Color.Green };
    case "POST":
      return { source: Icon.Plus, tintColor: Color.Blue };
    case "PUT":
      return { source: Icon.Pencil, tintColor: Color.Orange };
    case "DELETE":
      return { source: Icon.Trash, tintColor: Color.Red };
    case "PATCH":
      return { source: Icon.Wand, tintColor: Color.Purple };
    default:
      return { source: Icon.Globe, tintColor: Color.PrimaryText };
  }
}

/** 从 URL 提取展示用的路径；非法 URL 原样返回。 */
function urlLabel(url: string): string {
  const parsed = parseUrl(url);
  if (parsed) return parsed.pathname || parsed.host || url;
  return url;
}

/** 格式化时间戳为 `M/D HH:MM`。 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
