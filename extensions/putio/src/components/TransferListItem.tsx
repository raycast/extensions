import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import type { IFile, Transfer } from "@putdotio/api-client";
import { toHumanFileSize, toTimeAgo } from "@putdotio/utilities";
import { FileListItemNavigationActions } from "./FileListItemActions";
import { fetchFiles } from "../api/files";

const fetchFile = async (fileId: IFile["id"]) => {
  try {
    const { parent } = await fetchFiles(fileId);
    return parent;
  } catch (error) {
    return null;
  }
};

export const TransferListItemFileActions = ({ fileId }: { fileId: IFile["id"] }) => {
  const { data: file } = useCachedPromise(fetchFile, [fileId]);
  return file ? <FileListItemNavigationActions file={file} /> : null;
};

export const TransferListItem = ({ transfer }: { transfer: Transfer }) => {
  const statusText = useMemo(() => {
    if (transfer.status === "COMPLETED") {
      return `completed ${toTimeAgo(transfer.finished_at || transfer.created_at)}`;
    }

    return transfer.status.toLowerCase();
  }, [transfer]);

  return (
    <List.Item
      key={transfer.id}
      title={transfer.name}
      accessories={[
        {
          text: statusText,
        },
        {
          text: toHumanFileSize(transfer.size),
          icon: Icon.HardDrive,
        },
      ]}
      icon={getProgressIcon(transfer.percent_done / 100, Color.Green)}
      actions={
        <ActionPanel title={transfer.name}>
          {transfer.userfile_exists && transfer.file_id && <TransferListItemFileActions fileId={transfer.file_id} />}
        </ActionPanel>
      }
    />
  );
};
