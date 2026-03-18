import { Icon, List, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { timestampToReadableTime } from "./utils";

interface Folder {
  id: string;
  label: string;
  path: string;
  type: string;
  status: FolderStatus;
}

interface FolderStatus {
  state: string;
  stateChanged: string;
  globalBytes: number;
  globalFiles: number;
  localBytes: number;
  localFiles: number;
  needBytes: number;
  needFiles: number;
  pullErrors: number;
  version: number;
}

interface SyncthingFolderConfigApi {
  id: string;
  label?: string;
  path: string;
  type?: string;
}

interface SyncthingFolderStatusApi {
  state?: string;
  stateChanged?: string;
  globalBytes?: number;
  globalFiles?: number;
  localBytes?: number;
  localFiles?: number;
  needBytes?: number;
  needFiles?: number;
  pullErrors?: number;
  version?: number;
}

async function getFolders(
  API_KEY: string,
  BASE_URL: string,
): Promise<Folder[] | void> {
  // Call Syncthing API to get folders

  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    // Fetch folder configuration
    const configRes = await fetch(BASE_URL + "/config/folders", {
      headers,
    });
    const configData = (await configRes.json()) as SyncthingFolderConfigApi[];

    // Fetch status for each folder
    const folders: Folder[] = await Promise.all(
      configData.map(async (folder) => {
        const statusRes = await fetch(
          BASE_URL + "/db/status?folder=" + encodeURIComponent(folder.id),
          { headers },
        );
        const statusData = (await statusRes.json()) as SyncthingFolderStatusApi;

        return {
          id: folder.id,
          label: folder.label || folder.id,
          path: folder.path,
          type: folder.type || "sendreceive",
          status: {
            state: statusData.state || "unknown",
            stateChanged: statusData.stateChanged || "N/A",
            globalBytes: statusData.globalBytes || 0,
            globalFiles: statusData.globalFiles || 0,
            localBytes: statusData.localBytes || 0,
            localFiles: statusData.localFiles || 0,
            needBytes: statusData.needBytes || 0,
            needFiles: statusData.needFiles || 0,
            pullErrors: statusData.pullErrors || 0,
            version: statusData.version || 0,
          },
        };
      }),
    );

    showToast({
      title: "Folders fetched successfully",
      message: `Fetched ${folders.length} folders.`,
    });
    return folders;
  } catch (error) {
    console.error("Error fetching folders: ", error);
    showFailureToast("Failed to fetch folders.");
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getStateIcon(state: string): Icon {
  switch (state.toLowerCase()) {
    case "idle":
      return Icon.Checkmark;
    case "syncing":
      return Icon.ArrowClockwise;
    case "scanning":
      return Icon.MagnifyingGlass;
    case "error":
      return Icon.ExclamationMark;
    default:
      return Icon.QuestionMark;
  }
}

function getFolderTypeLabel(type: string): string {
  switch (type) {
    case "sendreceive":
      return "Send & Receive";
    case "sendonly":
      return "Send Only";
    case "receiveonly":
      return "Receive Only";
    case "receiveencrypted":
      return "Receive Encrypted";
    default:
      return type;
  }
}

function generateDetailMarkdown(folder: Folder): string {
  console.log("Folder.status: ", folder.status);
  const syncPercentage =
    folder.status.globalBytes > 0
      ? (
          ((folder.status.globalBytes - folder.status.needBytes) /
            folder.status.globalBytes) *
          100
        ).toFixed(2)
      : "100.00";

  return `
# ${folder.label}
**Folder ID**: ${folder.id}

## Status
- **State**: ${folder.status.state}
- **Progress**: ${syncPercentage}%
- **Last State Change**: ${timestampToReadableTime(folder.status.stateChanged)}
- **Type**: ${getFolderTypeLabel(folder.type)}

## Path
\`${folder.path}\`

## Sync Status
- **Local**: ${formatBytes(folder.status.localBytes)} (${folder.status.localFiles} files)
- **Global**: ${formatBytes(folder.status.globalBytes)} (${folder.status.globalFiles} files)
- **Out of Sync**: ${formatBytes(folder.status.needBytes)} (${folder.status.needFiles} files)

## Errors
- **Pull Errors**: ${folder.status.pullErrors}
`;
}

export default function Command() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    const API_KEY = getPreferenceValues().api_key;
    const BASE_URL = getPreferenceValues().base_url;
    getFolders(API_KEY, BASE_URL).then((fetchedFolders) => {
      setIsLoading(false);
      if (fetchedFolders) {
        setFolders(fetchedFolders);
      } else {
        showFailureToast("Failed to fetch folders.");
      }
    });
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search folders..."
      isShowingDetail
    >
      {folders.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.label}
          subtitle={folder.id}
          icon={getStateIcon(folder.status.state)}
          accessories={[
            {
              text: folder.status.state,
              icon: getStateIcon(folder.status.state),
            },
          ]}
          detail={
            <List.Item.Detail markdown={generateDetailMarkdown(folder)} />
          }
        />
      ))}
    </List>
  );
}
