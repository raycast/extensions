import {
  Action,
  ActionPanel,
  List,
  useNavigation,
  open,
  Icon,
  Image,
  Color,
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import { usePromise, getFavicon } from "@raycast/utils";
import { useState } from "react";
import { FolderNode } from "./types";
import {
  loadFolders,
  loadRecents,
  loadPins,
  addToRecents,
  addToPins,
  removeFromPins,
  getAllFolders,
  findFolderPath,
  cleanupStaleEntries,
  clearRecents,
} from "./storage";

function normalizeUrl(raw: string): { url: string; isWeb: boolean } {
  let url = raw.trim();

  // Remove surrounding quotes (single or double)
  url = url.replace(/^['"]|['"]$/g, "");

  // Detect local file paths (Mac/Windows)
  const isLocalPath =
    url.startsWith("/") || url.startsWith("~/") || url.startsWith("file://") || /^[a-zA-Z]:\\/.test(url); // Windows path like C:\

  if (isLocalPath) {
    if (!url.startsWith("file://")) {
      url = `file://${url}`;
    }
    return { url, isWeb: false };
  }

  // Add https:// only if no protocol present at all
  if (!/^\w+:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return { url, isWeb: true };
}

function buildBreadcrumb(parentTitle: string | undefined, folderName: string): string {
  return parentTitle ? `${parentTitle} / ${folderName}` : folderName;
}

function buildDetailMarkdown(folder: FolderNode): string {
  const hasChildren = folder.children && folder.children.length > 0;
  const lines: string[] = [];

  lines.push(`# ${folder.name}`);
  lines.push(``);

  if (folder.showDescription && folder.description?.trim()) {
    lines.push(folder.description.trim());
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  if (hasChildren) {
    lines.push(`**Contains:**`);
    lines.push(folder.children!.map((c) => `- ${c.name}`).join("\n"));
  }

  return lines.join("\n");
}

function flattenTree(nodes: FolderNode[], parentPath = ""): (FolderNode & { fullPath: string })[] {
  const result: (FolderNode & { fullPath: string })[] = [];
  for (const node of nodes) {
    if (!node.id || !node.name || !node.url) continue;
    const fullPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
    result.push({ ...node, fullPath });
    if (node.children) {
      result.push(...flattenTree(node.children, fullPath));
    }
  }
  return result;
}

function FolderItem({
  folder,
  parentTitle,
  onRefresh,
  hideMeta,
}: {
  folder: FolderNode;
  parentTitle?: string;
  onRefresh?: () => void;
  hideMeta?: boolean;
}) {
  const { data: pins, revalidate: revalidatePins } = usePromise(loadPins);
  const { data: allFolders } = usePromise(loadFolders);
  const isPinned = pins?.some((p) => p.id === folder.id) ?? false;
  const { push } = useNavigation();
  const hasChildren = folder.children && folder.children.length > 0;
  const allFlatFolders = flattenTree(allFolders ?? []);

  const resolvedPath = parentTitle
    ? buildBreadcrumb(parentTitle, folder.name)
    : (findFolderPath(allFolders ?? [], folder.id) ?? folder.name);

  const breadcrumb = resolvedPath;

  return (
    <List.Item
      icon={(() => {
        try {
          const { url, isWeb } = normalizeUrl(folder.url);

          // Local path — Mac shows Finder asset, Windows shows Raycast folder icon
          if (!isWeb) {
            const isMac = process.platform === "darwin";
            return isMac ? { source: "finder.png" } : { source: Icon.Folder, tintColor: Color.Blue };
          }

          // Web URL — favicon with explicit fallback (no globe)
          return getFavicon(url, {
            fallback: hasChildren ? Icon.Folder : Icon.Document,
            mask: Image.Mask.RoundedRectangle,
          });
        } catch {
          return hasChildren
            ? { source: Icon.Folder, tintColor: Color.Yellow }
            : { source: Icon.Document, tintColor: Color.Blue };
        }
      })()}
      title={folder.name}
      accessories={[
        ...(isPinned ? [{ icon: { source: Icon.Star, tintColor: Color.SecondaryText } }] : []),
        ...(!hideMeta && hasChildren
          ? [{ tag: { value: `${folder.children!.length}`, color: Color.SecondaryText } }]
          : []),
      ]}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(folder)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Path" text={breadcrumb} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="URL" target={folder.url} text={folder.url} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {hasChildren ? (
            <>
              <Action
                title="Navigate into Folder"
                icon={Icon.ArrowRight}
                onAction={() =>
                  push(
                    <FolderList
                      folders={folder.children!}
                      title={folder.name}
                      parentTitle={breadcrumb}
                      onRefresh={onRefresh}
                      allFlatFolders={allFlatFolders}
                    />,
                  )
                }
              />
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "return" },
                  Windows: { modifiers: ["ctrl"], key: "return" },
                }}
                onAction={async () => {
                  try {
                    const { url } = normalizeUrl(folder.url);
                    await addToRecents(folder);
                    await open(url);
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could Not Open",
                      message: "The URL is invalid.",
                    });
                  }
                }}
              />
            </>
          ) : (
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={async () => {
                try {
                  const { url } = normalizeUrl(folder.url);
                  await addToRecents(folder);
                  await open(url);
                } catch {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could Not Open",
                    message: "The URL is invalid.",
                  });
                }
              }}
            />
          )}
          <Action
            title="Copy URL"
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
            onAction={async () => {
              await Clipboard.copy(folder.url);
              await showToast({ style: Toast.Style.Success, title: "URL Copied" });
              await closeMainWindow();
            }}
          />
          <ActionPanel.Section>
            {isPinned ? (
              <Action
                title="Unpin Folder"
                icon={Icon.PinDisabled}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "p" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                }}
                onAction={async () => {
                  await removeFromPins(folder.id);
                  revalidatePins();
                  await showToast({ style: Toast.Style.Success, title: "Unpinned" });
                  onRefresh?.();
                }}
              />
            ) : (
              <Action
                title="Pin Folder"
                icon={Icon.Pin}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "p" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                }}
                onAction={async () => {
                  await addToPins(folder);
                  revalidatePins();
                  await showToast({ style: Toast.Style.Success, title: "Pinned" });
                  onRefresh?.();
                }}
              />
            )}
            <Action
              title="Clear Recents"
              icon={Icon.Clock}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "r" },
                Windows: { modifiers: ["ctrl", "shift"], key: "r" },
              }}
              onAction={async () => {
                await clearRecents();
                onRefresh?.();
                await showToast({ style: Toast.Style.Success, title: "Recents Cleared" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function FolderList({
  folders,
  title,
  parentTitle,
  onRefresh,
  allFlatFolders,
}: {
  folders: FolderNode[];
  title?: string;
  parentTitle?: string;
  onRefresh?: () => void;
  allFlatFolders: (FolderNode & { fullPath: string })[];
}) {
  const [searchText, setSearchText] = useState("");
  const isSearching = searchText.trim().length > 0;

  const searchResults = allFlatFolders.filter(
    (f) =>
      f.name.toLowerCase().includes(searchText.toLowerCase()) ||
      f.url.toLowerCase().includes(searchText.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const sectionTitle = parentTitle ?? title ?? "Open Portals";

  return (
    <List
      navigationTitle={title ?? "Open Portals"}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {isSearching ? (
        <List.Section title={`Results for "${searchText}"`}>
          {searchResults.length === 0 && <List.Item title="No results found" />}
          {searchResults.map((folder, index) => (
            <FolderItem
              key={`search-${folder.id ?? index}`}
              folder={folder}
              parentTitle={
                folder.fullPath.includes(" / ")
                  ? folder.fullPath.substring(0, folder.fullPath.lastIndexOf(" / "))
                  : undefined
              }
              onRefresh={onRefresh}
              hideMeta
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title={sectionTitle}>
          {folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} parentTitle={parentTitle} onRefresh={onRefresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchText, setSearchText] = useState("");
  const { data: folders, revalidate: revalidateFolders } = usePromise(loadFolders);
  const { data: recentFolders, revalidate: revalidateRecents } = usePromise(loadRecents);
  const { data: pinnedFolders, revalidate: revalidatePins } = usePromise(loadPins);

  usePromise(async () => {
    const live = await loadFolders();
    await cleanupStaleEntries(live);
    revalidateRecents();
    revalidatePins();
  });

  function refreshAll() {
    revalidateFolders();
    revalidateRecents();
    revalidatePins();
    setRefreshKey((k) => k + 1);
  }

  function resolveFolders(snapshots: FolderNode[]): FolderNode[] {
    const all = getAllFolders(folders ?? []);
    return snapshots.map((s) => all.find((f) => f.id === s.id) ?? s).filter(Boolean);
  }

  const isEmpty = !folders || folders.length === 0;
  const isSearching = searchText.trim().length > 0;

  // Flatten entire tree for search
  const allFlatFolders = flattenTree(folders ?? []);
  const searchResults = allFlatFolders.filter(
    (f) =>
      f.name.toLowerCase().includes(searchText.toLowerCase()) ||
      f.url.toLowerCase().includes(searchText.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List navigationTitle="Open Portals" isShowingDetail searchText={searchText} onSearchTextChange={setSearchText}>
      {/* Search results mode — flat list of all matching folders */}
      {isSearching && (
        <List.Section title={`Results for "${searchText}"`}>
          {searchResults.length === 0 && <List.Item title="No results found" />}
          {searchResults.map((folder) => (
            <FolderItem
              key={`search-${folder.id}-${refreshKey}`}
              folder={folder}
              parentTitle={
                folder.fullPath.includes(" / ")
                  ? folder.fullPath.substring(0, folder.fullPath.lastIndexOf(" / "))
                  : undefined
              }
              onRefresh={refreshAll}
              hideMeta
            />
          ))}
        </List.Section>
      )}

      {/* Normal browsing mode */}
      {!isSearching && isEmpty && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Portals Yet"
          description="Open 'Edit Portals' to add your first portal."
        />
      )}
      {!isSearching && pinnedFolders && pinnedFolders.length > 0 && (
        <List.Section title="Pinned">
          {resolveFolders(pinnedFolders).map((folder) => (
            <FolderItem key={`pinned-${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} hideMeta />
          ))}
        </List.Section>
      )}
      {!isSearching && recentFolders && recentFolders.length > 0 && (
        <List.Section title="Recent">
          {resolveFolders(recentFolders).map((folder) => (
            <FolderItem key={`recent-${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} hideMeta />
          ))}
        </List.Section>
      )}
      {!isSearching && folders && folders.length > 0 && (
        <List.Section title="All Folders">
          {folders.map((folder) => (
            <FolderItem key={`${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
