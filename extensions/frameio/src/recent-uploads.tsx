import { JSX } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  showToast,
  Toast,
  LocalStorage,
  openExtensionPreferences,
  open,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { authorize } from "./auth";
import { debug } from "./debug";
import {
  listAccounts,
  listWorkspaces,
  streamRecentUploadsInWorkspace,
  RecentFile,
  Workspace,
  formatFileSize,
  getThumbnailUrl,
  getAssetIcon,
} from "./api/frameio";
import { RequireClientId } from "./components/RequireClientId";
import { buildFileDetail, useFileDetailEnrichment } from "./components/AssetDetail";
import { resolveContainingFolder, saveLastFolderFromParent } from "./last-folder";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedUploads {
  ts: number;
  files: RecentFile[];
}

function cacheKey(workspaceId: string): string {
  return `recent-uploads-${workspaceId}`;
}

async function readCache(workspaceId: string): Promise<RecentFile[] | null> {
  const raw = await LocalStorage.getItem<string>(cacheKey(workspaceId));
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as CachedUploads;
    if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
    return cached.files;
  } catch {
    return null;
  }
}

async function writeCache(workspaceId: string, files: RecentFile[]): Promise<void> {
  await LocalStorage.setItem(cacheKey(workspaceId), JSON.stringify({ ts: Date.now(), files }));
}

export default function RecentUploadsCommand(): JSX.Element {
  return (
    <RequireClientId>
      <RecentUploadsMain />
    </RequireClientId>
  );
}

function RecentUploadsMain(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [showDetail, setShowDetail] = useCachedState("recent-uploads-show-detail", false);
  const scanRef = useRef(0);

  const fileRefs = useMemo(() => files.map(({ file }) => ({ id: file.id, project_id: file.project_id })), [files]);

  const { commentCounts, isLoadingComments } = useFileDetailEnrichment(accountId, fileRefs, showDetail);

  const loadFiles = useCallback(async (accId: string, wsId: string, forceRefresh = false) => {
    if (!wsId) return;

    const scanId = ++scanRef.current;

    if (!forceRefresh) {
      const cached = await readCache(wsId);
      if (cached && cached.length > 0) {
        setFiles(cached);
        setIsLoading(false);
        debug.info(`${cached.length} upload(s) from cache`);
      } else {
        setFiles([]);
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }

    setIsScanning(true);

    try {
      const result = await streamRecentUploadsInWorkspace(accId, wsId, 30, (batch, scanning) => {
        if (scanId !== scanRef.current) return;
        setFiles(batch);
        setIsLoading(false);
        setIsScanning(scanning);
      });

      if (scanId === scanRef.current && result.length > 0) {
        await writeCache(wsId, result);
      }
    } catch (error) {
      if (scanId !== scanRef.current) return;
      debug.error("Failed to load recent uploads", error);
      setFiles((current) => {
        if (current.length === 0) {
          showToast({ style: Toast.Style.Failure, title: "Loading Error", message: String(error) });
        } else {
          showToast({
            style: Toast.Style.Animated,
            title: "Partial Scan",
            message: `${current.length} file(s) shown`,
          });
        }
        return current;
      });
    } finally {
      if (scanId === scanRef.current) {
        setIsLoading(false);
        setIsScanning(false);
      }
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await authorize();
        const accounts = await listAccounts();
        if (accounts.length === 0) throw new Error("No Frame.io account found.");
        const account = accounts[0];
        setAccountId(account.id);

        const ws = await listWorkspaces(account.id);
        setWorkspaces(ws);

        const wsId = ws[0]?.id ?? "";
        setWorkspaceId(wsId);
        if (wsId) await loadFiles(account.id, wsId);
        else setIsLoading(false);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Initialization Error", message: String(error) });
        setIsLoading(false);
      }
    }
    init();
  }, [loadFiles]);

  const workspaceDropdown =
    workspaces.length > 0 ? (
      <List.Dropdown
        tooltip="Workspace"
        value={workspaceId}
        onChange={(id) => {
          setWorkspaceId(id);
          loadFiles(accountId, id, true);
        }}
      >
        {workspaces.map((ws) => (
          <List.Dropdown.Item key={ws.id} value={ws.id} title={ws.name} />
        ))}
      </List.Dropdown>
    ) : null;

  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name ?? "";

  return (
    <List
      isLoading={isLoading && files.length === 0}
      searchBarPlaceholder="Filter files…"
      searchBarAccessory={workspaceDropdown}
      isShowingDetail={showDetail}
    >
      {!isLoading && !isScanning && files.length === 0 && (
        <List.EmptyView
          title="No Files"
          description={`No files found in workspace "${workspaceName}".`}
          icon={Icon.Document}
        />
      )}

      <List.Section
        title={workspaceName ? `Workspace: ${workspaceName}${isScanning ? " — scanning…" : ""}` : undefined}
      >
        {files.map(({ file, projectName }) => {
          const thumbnail = getThumbnailUrl(file);
          const listIcon = thumbnail ? { source: thumbnail, mask: Image.Mask.RoundedRectangle } : getAssetIcon(file);

          return (
            <List.Item
              key={file.id}
              title={file.name}
              subtitle={showDetail ? undefined : projectName}
              icon={listIcon}
              accessories={
                showDetail
                  ? undefined
                  : [
                      { text: formatFileSize(file.file_size), tooltip: "Size" },
                      { date: new Date(file.created_at), tooltip: "Uploaded" },
                    ]
              }
              detail={
                showDetail
                  ? buildFileDetail(file, {
                      thumbnailUrl: thumbnail,
                      projectName,
                      commentCount: commentCounts[file.id],
                      isLoadingComments,
                    })
                  : undefined
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Frame.io" url={file.view_url} />
                    <Action
                      title="Open Parent Folder"
                      icon={Icon.Folder}
                      onAction={async () => {
                        const parent = await resolveContainingFolder(accountId, file.parent_id);
                        if (parent?.viewUrl) {
                          await open(parent.viewUrl);
                          await saveLastFolderFromParent(accountId, file.parent_id);
                        } else {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Parent Folder URL Not Found",
                          });
                        }
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Frame.io URL"
                      content={file.view_url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => loadFiles(accountId, workspaceId, true)}
                    />
                    <Action
                      title={showDetail ? "Hide Details" : "Show Details"}
                      icon={showDetail ? Icon.EyeDisabled : Icon.Sidebar}
                      onAction={() => setShowDetail((v) => !v)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
