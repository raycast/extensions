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
  addTopins,
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

  // Add https:// if no protocol present
  if (!/^https?:\/\//i.test(url)) {
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
    /*
            } else {
                lines.push(`**No subfolders**`);
            */
  }

  return lines.join("\n");
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
              await closeMainWindow();
              await showToast({ style: Toast.Style.Success, title: "URL Copied" });
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
                  await addTopins(folder);
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
}: {
  folders: FolderNode[];
  title?: string;
  parentTitle?: string;
  onRefresh?: () => void;
}) {
  const sectionTitle = parentTitle ?? title ?? "Browse Folders";

  return (
    <List navigationTitle={title ?? "Browse Folders"} isShowingDetail>
      <List.Section title={sectionTitle}>
        {folders.map((folder) => (
          <FolderItem key={folder.id} folder={folder} parentTitle={parentTitle} onRefresh={onRefresh} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const [refreshKey, setRefreshKey] = useState(0);
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

  return (
    <List navigationTitle="Open Portals" isShowingDetail>
      {isEmpty && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Portals Yet"
          description="Open 'Edit Portals' to add your first portal."
        />
      )}
      {pinnedFolders && pinnedFolders.length > 0 && (
        <List.Section title="Pinned">
          {resolveFolders(pinnedFolders).map((folder) => (
            <FolderItem key={`pinned-${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} hideMeta />
          ))}
        </List.Section>
      )}
      {recentFolders && recentFolders.length > 0 && (
        <List.Section title="Recent">
          {resolveFolders(recentFolders).map((folder) => (
            <FolderItem key={`recent-${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} hideMeta />
          ))}
        </List.Section>
      )}
      {folders && folders.length > 0 && (
        <List.Section title="All Folders">
          {folders.map((folder) => (
            <FolderItem key={`${folder.id}-${refreshKey}`} folder={folder} onRefresh={refreshAll} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
