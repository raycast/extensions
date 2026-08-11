import { useEffect, useMemo, useState } from "react";
import { List, Grid, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { Arena } from "./api/arena";
import { useArena } from "./hooks/useArena";
import { useViewMode } from "./hooks/useViewMode";
import type { ApiMeta, Block, SearchSort } from "./api/types";
import { BlockActions } from "./components/BlockActions";
import { getIconSource } from "./utils/icons";
import { addRecentQuery } from "./utils/searchHistory";
import { arenaOAuth } from "./api/oauth";
import { getDefaultSort, getPageSize } from "./utils/preferences";

const BLOCK_TYPES = [
  { value: "Block", title: "All Blocks" },
  { value: "Text", title: "Text" },
  { value: "Image", title: "Image" },
  { value: "Link", title: "Link" },
  { value: "Attachment", title: "Attachment" },
  { value: "Embed", title: "Embed" },
];

const SORT_OPTIONS: { value: SearchSort; title: string }[] = [
  { value: "score_desc", title: "Best Match" },
  { value: "updated_at_desc", title: "Recently Updated" },
  { value: "created_at_desc", title: "Recently Created" },
  { value: "name_asc", title: "Name A-Z" },
];

const DROPDOWN_SEP = "|||";

/** Block-type rows: unique value so they never collide with sort rows (Raycast matches one item by `value`). */
function encodeBlockTypeRow(blockType: string, sort: SearchSort): string {
  return `B${DROPDOWN_SEP}${blockType}${DROPDOWN_SEP}${sort}`;
}

/** Sort rows: different prefix so e.g. `B|||Embed|||score_desc` and `S|||Embed|||score_desc` are not duplicates. */
function encodeSortRow(blockType: string, sort: SearchSort): string {
  return `S${DROPDOWN_SEP}${blockType}${DROPDOWN_SEP}${sort}`;
}

function parseBlockDropdown(value: string): { blockType: string; sort: SearchSort } {
  const parts = value.split(DROPDOWN_SEP);
  if (parts.length < 3) return { blockType: "Block", sort: "score_desc" };
  const [kind, a, b] = parts;
  if (kind === "B" || kind === "S") {
    return { blockType: a || "Block", sort: (b as SearchSort) || "score_desc" };
  }
  return { blockType: "Block", sort: "score_desc" };
}

async function enrichBlocks(arena: Arena, blocks: Block[]): Promise<Block[]> {
  return Promise.all(
    blocks.map(async (b) => {
      if (!b.id) return b;
      try {
        return await arena.block(b.id).get();
      } catch {
        return b;
      }
    }),
  );
}

function ToggleViewAction({ mode, toggle }: { mode: "list" | "grid"; toggle: () => void }) {
  return (
    <Action
      icon={mode === "list" ? Icon.AppWindowGrid2x2 : Icon.List}
      title={mode === "list" ? "View as Grid" : "View as List"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      onAction={toggle}
    />
  );
}

function BlockItemActions({ block, mode, toggle }: { block: Block; mode: "list" | "grid"; toggle: () => void }) {
  return (
    <BlockActions
      block={block}
      extraActions={
        <ActionPanel.Section>
          <ToggleViewAction mode={mode} toggle={toggle} />
        </ActionPanel.Section>
      }
    />
  );
}

function BlockSearchDropdown({
  sort,
  blockType,
  onChange,
  Dropdown,
  DropdownSection,
  DropdownItem,
}: {
  sort: SearchSort;
  blockType: string;
  onChange: (blockType: string, sort: SearchSort) => void;
  Dropdown: typeof List.Dropdown;
  DropdownSection: typeof List.Dropdown.Section;
  DropdownItem: typeof List.Dropdown.Item;
}) {
  return (
    <Dropdown
      tooltip="Block type & sort"
      value={encodeBlockTypeRow(blockType, sort)}
      onChange={(value) => {
        const decoded = parseBlockDropdown(value);
        onChange(decoded.blockType, decoded.sort);
      }}
    >
      <DropdownSection title="Block type">
        {BLOCK_TYPES.map((item) => (
          <DropdownItem key={item.value} value={encodeBlockTypeRow(item.value, sort)} title={item.title} />
        ))}
      </DropdownSection>
      <DropdownSection title="Sort">
        {SORT_OPTIONS.map((item) => (
          <DropdownItem key={item.value} value={encodeSortRow(blockType, item.value)} title={item.title} />
        ))}
      </DropdownSection>
    </Dropdown>
  );
}

function Command() {
  const arena = useArena();
  const pageSize = getPageSize();
  const { mode, toggle } = useViewMode("search-blocks", "list");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SearchSort>(() => getDefaultSort() as SearchSort);
  const [blockType, setBlockType] = useState("Block");
  const trimmedQuery = query.trim();
  const [listMeta, setListMeta] = useState<ApiMeta | undefined>();
  useEffect(() => {
    if (!trimmedQuery) setListMeta(undefined);
  }, [trimmedQuery]);

  const {
    data: items = [],
    isLoading,
    pagination,
  } = useCachedPromise(
    (q: string, sortArg: SearchSort, type: string) =>
      async ({ page }) => {
        const response = await arena.search(q).blocks({ page: page + 1, per: pageSize, sort: sortArg, type });
        const enriched = await enrichBlocks(arena, response.blocks);
        if (page === 0) {
          await addRecentQuery(q);
          setListMeta(response.meta);
        }
        const seen = new Set<number>();
        const unique = enriched.filter((b) => {
          const id = b.id;
          if (id == null) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        return { data: unique, hasMore: response.meta?.has_more_pages ?? false };
      },
    [trimmedQuery, sort, blockType],
    {
      initialData: [],
      keepPreviousData: true,
      execute: trimmedQuery.length > 0,
      failureToastOptions: { title: "Failed to search blocks" },
    },
  );

  const uniqueItems = useMemo(() => {
    const seen = new Set<number>();
    return (items ?? []).filter((b) => {
      const id = b.id;
      if (id == null) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [items]);

  const sectionTitle = listMeta?.total_count ? `Blocks (${listMeta.total_count})` : undefined;

  function onDropdownChange(nextBlockType: string, nextSort: SearchSort) {
    setBlockType(nextBlockType);
    setSort(nextSort);
  }

  const emptyBeforeQuery = (
    <Grid.EmptyView
      icon={{ source: "extension-icon.png" }}
      title="Search Are.na Blocks"
      description="Type a keyword to find text, images, links, and more"
    />
  );

  if (mode === "grid") {
    return (
      <Grid
        columns={4}
        isLoading={isLoading}
        pagination={trimmedQuery ? pagination : undefined}
        onSearchTextChange={setQuery}
        searchBarPlaceholder="Search blocks"
        searchBarAccessory={
          <BlockSearchDropdown
            sort={sort}
            blockType={blockType}
            onChange={onDropdownChange}
            Dropdown={Grid.Dropdown}
            DropdownSection={Grid.Dropdown.Section}
            DropdownItem={Grid.Dropdown.Item}
          />
        }
      >
        {!query.trim() ? (
          emptyBeforeQuery
        ) : isLoading && uniqueItems.length === 0 ? (
          <Grid.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
        ) : uniqueItems.length === 0 ? (
          <Grid.EmptyView title="No blocks found" description="Try a different search term or block type" />
        ) : (
          <Grid.Section title={sectionTitle}>
            {uniqueItems.map((block, index) => (
              <Grid.Item
                key={block.id != null ? String(block.id) : `block-${index}`}
                content={getIconSource(block)}
                title={block.title?.trim() || block.generated_title || "Untitled"}
                subtitle={[block.class, block.user?.full_name].filter(Boolean).join(" · ")}
                actions={<BlockItemActions block={block} mode={mode} toggle={toggle} />}
              />
            ))}
          </Grid.Section>
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={trimmedQuery ? pagination : undefined}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search blocks"
      searchBarAccessory={
        <BlockSearchDropdown
          sort={sort}
          blockType={blockType}
          onChange={onDropdownChange}
          Dropdown={List.Dropdown}
          DropdownSection={List.Dropdown.Section}
          DropdownItem={List.Dropdown.Item}
        />
      }
    >
      {!query.trim() ? (
        <List.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="Search Are.na Blocks"
          description="Type a keyword to find text, images, links, and more"
        />
      ) : isLoading && uniqueItems.length === 0 ? (
        <List.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
      ) : uniqueItems.length === 0 ? (
        <List.EmptyView title="No blocks found" description="Try a different search term or block type" />
      ) : (
        <List.Section title={sectionTitle}>
          {uniqueItems.map((block, index) => {
            const title = block.title?.trim() || block.generated_title || "Untitled";
            const subtitleParts = [block.class, block.user?.full_name].filter(Boolean);
            return (
              <List.Item
                key={block.id != null ? String(block.id) : `block-${index}`}
                icon={getIconSource(block)}
                title={title}
                subtitle={subtitleParts.join(" · ")}
                accessories={[
                  { text: `${block.comment_count}`, icon: Icon.Bubble, tooltip: "Comments" },
                  {
                    text: new Date(block.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                    tooltip: "Updated",
                  },
                ]}
                actions={<BlockItemActions block={block} mode={mode} toggle={toggle} />}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(arenaOAuth)(Command);
