import { Action, ActionPanel, Icon, Image, Keyboard, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { Args } from "../lib/core";
import { Obj, extractArray, pick } from "../lib/format";
import { sectionLabel } from "../lib/theme";
import { RecordCard } from "./RecordCard";
import { friendly, read, reportError } from "../lib/mcp";
import { TOOL_MAP } from "../lib/tools";
import { FooterActions } from "./Footer";

interface Props {
  tool: string;
  args?: Args;
  title?: string;
  arrayKeys?: string[];
  itemTitle?: (o: Obj) => string | undefined;
  itemSubtitle?: (o: Obj) => string | undefined;
  accessories?: (o: Obj) => List.Item.Accessory[];
  itemIcon?: (o: Obj) => Image.ImageLike | undefined;
  itemDetail?: (o: Obj) => ReactNode;
  sectionTitle?: string;
  onQuery?: (q: string) => void;
  itemActions?: (o: Obj, reload: () => void) => ReactNode;
  listActions?: (reload: () => void) => ReactNode;
  searchArg?: string;
  searchPlaceholder?: string;
  paged?: "offset" | "page";
  pageSize?: number;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  emptyTitle?: string;
  /** Eyebrow shown on each detail pane and as the section title. */
  label?: string;
}

const TITLE_KEYS = ["name", "title", "subject", "label", "slug", "domain", "reference", "id"];
const SUB_KEYS = ["tagline", "category", "company", "location", "status", "type", "email", "created_at", "posted_at"];

/** Generic "run a read tool → list of items with detail pane" view. */
export function ToolList(p: Props) {
  const [text, setText] = useState("");
  const [page, setPage] = useState(0);
  const size = p.pageSize ?? 20;
  const args: Args = {
    ...p.args,
    ...(p.searchArg ? { [p.searchArg]: text } : {}),
    ...(p.paged === "offset" ? { offset: page * size, limit: size } : {}),
    ...(p.paged === "page" ? { page: page + 1, limit: size } : {}),
  };
  const { data, isLoading, error, revalidate } = usePromise(read, [p.tool, args], { onError: reportError });
  const items = data ? extractArray(data.data, p.arrayKeys) : [];
  const meta = (data?.data ?? {}) as Obj;
  const hasMore = p.paged ? Boolean(meta.has_more) || (meta.has_more === undefined && items.length >= size) : false;
  const total = typeof meta.total === "number" ? meta.total : undefined;
  const f = error ? friendly(error) : undefined;

  const pager = p.paged ? (
    <ActionPanel.Section title="Paging">
      {hasMore && (
        <Action
          title="Next Page"
          icon={Icon.ArrowRight}
          onAction={() => setPage((n) => n + 1)}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
        />
      )}
      {page > 0 && (
        <Action
          title="Previous Page"
          icon={Icon.ArrowLeft}
          onAction={() => setPage((n) => Math.max(0, n - 1))}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
        />
      )}
    </ActionPanel.Section>
  ) : null;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={p.title ?? TOOL_MAP[p.tool]?.title}
      isShowingDetail={items.length > 0}
      searchBarPlaceholder={p.searchPlaceholder}
      onSearchTextChange={
        p.searchArg
          ? (t) => {
              setText(t);
              setPage(0);
              p.onQuery?.(t);
            }
          : undefined
      }
      filtering={p.searchArg ? false : true}
      throttle
      searchBarAccessory={p.searchBarAccessory}
      actions={
        <ActionPanel>
          {p.listActions?.(revalidate)}
          {pager}
          <FooterActions />
        </ActionPanel>
      }
    >
      {f ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={f.title}
          description={f.message}
          actions={
            <ActionPanel>
              {f.url && <Action title="Open Link" icon={Icon.Link} onAction={() => open(f.url!)} />}
              <FooterActions />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title={p.emptyTitle ?? "Nothing here"}
          description={isLoading ? "Loading…" : undefined}
          actions={<ActionPanel>{p.listActions?.(revalidate)}</ActionPanel>}
        />
      )}
      <List.Section
        title={p.sectionTitle ?? sectionLabel(p.label ?? TOOL_MAP[p.tool]?.title ?? "Records")}
        subtitle={total !== undefined ? `${items.length} shown · ${total} total` : undefined}
      >
        {items.map((o, i) => (
          <List.Item
            key={`${pick(o, ["id", "slug", "lead_id"]) ?? i}-${i}`}
            title={p.itemTitle?.(o) ?? pick(o, TITLE_KEYS) ?? `Item ${i + 1}`}
            subtitle={p.itemSubtitle?.(o) ?? pick(o, SUB_KEYS)}
            icon={p.itemIcon?.(o)}
            accessories={p.accessories?.(o)}
            detail={p.itemDetail ? p.itemDetail(o) : <RecordCard item={o} label={p.label ?? TOOL_MAP[p.tool]?.title ?? "Record"} />}
            actions={
              <ActionPanel>
                {p.itemActions?.(o, revalidate)}
                <Action.CopyToClipboard title="Copy Item JSON" content={JSON.stringify(o, null, 2)} />
                <ActionPanel.Section>{p.listActions?.(revalidate)}</ActionPanel.Section>
                {pager}
                <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.Refresh} />
                <FooterActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
