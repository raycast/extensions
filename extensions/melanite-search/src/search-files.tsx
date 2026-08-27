import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Keyboard,
  openExtensionPreferences,
  type LaunchProps,
} from "@raycast/api";
import { useCachedState, useSQL } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { formatDate, formatSize, itemName, kindIcon, kindLabel, tagColor } from "./lib/format";
import {
  getPreferences,
  itemFilePath,
  itemFolderPath,
  markdownImagePath,
  resolveLibrary,
  thumbPath,
  type Library,
} from "./lib/library";
import { buildItemsQuery, parseTags, type ItemRow, type KindFilter, type TagRef } from "./lib/query";

const KIND_OPTIONS: { value: KindFilter; title: string }[] = [
  { value: "all", title: "All Kinds" },
  { value: "note", title: "Notes" },
  { value: "image", title: "Images" },
  { value: "video", title: "Videos" },
  { value: "audio", title: "Audio" },
  { value: "document", title: "Documents" },
  { value: "other", title: "Other" },
];

/**
 * macOS と Windows の両方で配布するので、修飾キーは platform ごとに分けて書く
 * (cmd → ctrl, opt → alt)。片方だけ書くと @raycast/no-ambiguous-platform-shortcut で怒られる。
 */
function shortcut(mac: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const win = mac.map((m) => (m === "cmd" ? "ctrl" : m === "opt" ? "alt" : m)) as Keyboard.KeyModifier[];
  return { macOS: { modifiers: mac, key }, Windows: { modifiers: win, key } };
}

const SHORTCUT = {
  toggleDetail: shortcut(["cmd"], "d"),
  filterByTag: shortcut(["cmd"], "t"),
  copyPath: shortcut(["cmd", "shift"], "c"),
  copyName: shortcut(["cmd", "shift"], "n"),
  copyFile: shortcut(["cmd", "opt"], "c"),
  copyTags: shortcut(["cmd", "shift"], "t"),
  openFolder: shortcut(["cmd", "shift"], "o"),
  openWith: shortcut(["cmd", "shift"], "enter"),
};

export default function SearchFiles(props: LaunchProps) {
  const preferences = getPreferences();
  const library = useMemo(() => resolveLibrary(preferences.libraryPath), [preferences.libraryPath]);

  const [searchText, setSearchText] = useState((props.fallbackText ?? "").trim());
  const [kind, setKind] = useCachedState<KindFilter>("kind-filter", "all");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-detail", true);

  const query = useMemo(
    () =>
      buildItemsQuery({
        search: searchText,
        kind,
        sortOrder: preferences.sortOrder,
        limit: Number(preferences.resultLimit) || 100,
        searchMemo: preferences.searchMemo !== false,
      }),
    [searchText, kind, preferences.sortOrder, preferences.resultLimit, preferences.searchMemo],
  );

  const { data, isLoading, permissionView } = useSQL<ItemRow>(library.dbPath, query, {
    execute: library.valid,
  });

  // useSQL は再実行のたびに data を undefined に戻すので、
  // 入力中に一覧が消えてちらつかないよう直前の結果を持っておく
  const lastData = useRef<ItemRow[]>([]);
  if (data) {
    lastData.current = data;
  }

  if (permissionView) {
    return permissionView;
  }

  if (!library.valid) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Melanite Library Not Found"
          description={`${library.problem ?? ""}\n\nPick your .melanite folder in the extension preferences.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const items = data ?? lastData.current;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by file name or #tag…"
      isShowingDetail={isShowingDetail && items.length > 0}
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Kind" value={kind} onChange={(value) => setKind(value as KindFilter)}>
          {KIND_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={searchText ? "No Matching Items" : "Nothing in This Library"}
        description={
          searchText
            ? "Try a shorter term. Prefix a word with # to match tag names only."
            : "Import some files in Melanite first."
        }
      />
      {items.map((item) => (
        <ItemListItem
          key={item.id}
          item={item}
          library={library}
          isShowingDetail={isShowingDetail}
          onToggleDetail={() => setIsShowingDetail((current) => !current)}
          onSelectTag={(tag) => setSearchText(`#${tag}`)}
        />
      ))}
    </List>
  );
}

function ItemListItem({
  item,
  library,
  isShowingDetail,
  onToggleDetail,
  onSelectTag,
}: {
  item: ItemRow;
  library: Library;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onSelectTag: (tag: string) => void;
}) {
  const name = itemName(item);
  const filePath = itemFilePath(library, item.id, item.file_name);
  const folderPath = itemFolderPath(library, item.id);
  const thumb = thumbPath(library, item.id);
  const tags = parseTags(item.tags_json);

  const accessories: List.Item.Accessory[] = [];
  if (!isShowingDetail) {
    if (item.starred) {
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" });
    }
    if (tags.length > 0) {
      accessories.push({ tag: { value: tags[0].name, color: tagColor(tags[0].color) } });
    }
    if (tags.length > 1) {
      accessories.push({ text: `+${tags.length - 1}` });
    }
    accessories.push({ text: formatSize(item.size) });
  }

  return (
    <List.Item
      icon={thumb ? { source: thumb, fallback: kindIcon(item.kind) } : kindIcon(item.kind)}
      title={name}
      subtitle={isShowingDetail ? undefined : tags.map((t) => t.name).join(", ")}
      accessories={accessories}
      keywords={tags.map((t) => t.name)}
      quickLook={{ path: filePath, name }}
      detail={<ItemDetail item={item} name={name} thumb={thumb} filePath={filePath} tags={tags} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open File" target={filePath} icon={Icon.ArrowNe} />
            <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
            <Action.ShowInFinder path={filePath} />
            <Action.Open
              title="Open Item Folder"
              target={folderPath}
              icon={Icon.Folder}
              shortcut={SHORTCUT.openFolder}
            />
            <Action.OpenWith path={filePath} shortcut={SHORTCUT.openWith} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={SHORTCUT.toggleDetail}
              onAction={onToggleDetail}
            />
            {tags.length > 0 && (
              <ActionPanel.Submenu title="Filter by Tag" icon={Icon.Tag} shortcut={SHORTCUT.filterByTag}>
                {tags.map((tag) => (
                  <Action
                    key={tag.name}
                    title={tag.name}
                    icon={{ source: Icon.Tag, tintColor: tagColor(tag.color) }}
                    onAction={() => onSelectTag(tag.name)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy File Path" content={filePath} shortcut={SHORTCUT.copyPath} />
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={SHORTCUT.copyName} />
            <Action.CopyToClipboard title="Copy File" content={{ file: filePath }} shortcut={SHORTCUT.copyFile} />
            {tags.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Tags"
                content={tags.map((t) => t.name).join(", ")}
                shortcut={SHORTCUT.copyTags}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ItemDetail({
  item,
  name,
  thumb,
  filePath,
  tags,
}: {
  item: ItemRow;
  name: string;
  thumb: string | undefined;
  filePath: string;
  tags: TagRef[];
}) {
  const markdown = useMemo(() => {
    const blocks: string[] = [];
    // 画像はサムネイルがあればそれを、無ければ実体をそのまま出す。
    // それ以外の種別は excerpt (ノート・テキストの先頭 ~300 字) をプレビューに使う。
    const preview = thumb ?? (item.kind === "image" ? filePath : undefined);
    if (preview) {
      const alt = name.replace(/[[\]]/g, "");
      blocks.push(`![${alt}](<${markdownImagePath(preview)}?raycast-width=350>)`);
    }
    if (item.excerpt) {
      blocks.push(item.excerpt);
    }
    if (blocks.length === 0) {
      blocks.push(`### ${name}`);
    }
    return blocks.join("\n\n");
  }, [name, item.excerpt, item.kind, thumb, filePath]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Kind" text={kindLabel(item.kind)} icon={kindIcon(item.kind)} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatSize(item.size)} />
          {item.width && item.height ? (
            <List.Item.Detail.Metadata.Label title="Dimensions" text={`${item.width} × ${item.height}`} />
          ) : null}
          {tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag.name} text={tag.name} color={tagColor(tag.color)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {item.memo ? <List.Item.Detail.Metadata.Label title="Memo" text={item.memo} /> : null}
          {item.starred ? <List.Item.Detail.Metadata.Label title="Starred" icon={Icon.Star} text="Yes" /> : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(item.modified_at)} />
          <List.Item.Detail.Metadata.Label title="Created" text={formatDate(item.created_at)} />
          <List.Item.Detail.Metadata.Label title="Imported" text={formatDate(item.imported_at)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
