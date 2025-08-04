import { useEffect, useState } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import {
  archiveMemo,
  deleteMemo,
  getAllMemos,
  getMe,
  getRequestUrl,
  getAttachmentBinToBase64,
  restoreMemo,
} from "./api";
import { MemoInfoResponse, ROW_STATUS } from "./types";

export default function MemosListCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number>();
  const [state, setState] = useState(ROW_STATUS.NORMAL);
  const { isLoading, data, revalidate, pagination } = getAllMemos(currentUserId, { state });
  const {
    isLoading: isLoadingUser,
    data: { user },
  } = getMe();
  const [filterList, setFilterList] = useState<MemoInfoResponse[]>([]);

  useEffect(() => {
    if (!isLoadingUser && user.name) {
      const userId = +user.name.split("/")[1];
      setCurrentUserId(userId);
    }
  }, [isLoadingUser]);

  useEffect(() => {
    if (currentUserId) {
      revalidate();
    }
  }, [currentUserId]);

  useEffect(() => {
    const dataList = data || [];

    setFilterList(
      dataList
        .filter((item) => item.content.includes(searchText))
        .map((item) => {
          item.markdown = item.content;
          if (item.attachments.length > 0) {
            getItemMarkdown(item);
          }
          return item;
        }) || [],
    );
  }, [searchText]);

  useEffect(() => {
    const dataList = data || [];
    setFilterList(
      dataList.map((item) => {
        item.markdown = item.content;

        if (item.attachments.length > 0) {
          getItemMarkdown(item);
        }

        return item;
      }),
    );
  }, [data]);

  function getItemUrl(item: MemoInfoResponse) {
    const url = getRequestUrl(`/${item.name}`);

    return url;
  }

  async function getItemMarkdown(item: MemoInfoResponse) {
    const { content, attachments } = item;
    let markdown = content;

    const attachmentMarkdowns = await Promise.all(
      attachments.map(async (attachment) => {
        const attachmentBlobUrl = await getAttachmentBinToBase64(attachment.name, attachment.filename);
        return `\n\n![${attachment.filename}](${attachmentBlobUrl})`;
      }),
    );

    markdown += attachmentMarkdowns.join("");

    setFilterList((prevList) => {
      const updatedList = prevList.map((prevItem) => {
        if (prevItem.name === item.name) {
          return { ...prevItem, markdown };
        }
        return prevItem;
      });
      return updatedList;
    });
  }

  async function onArchive(item: MemoInfoResponse) {
    if (
      await confirmAlert({
        title: "Are you sure?",
        icon: Icon.Store,
        primaryAction: {
          title: "Archive",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      showToast({
        style: Toast.Style.Animated,
        title: "Archive...",
      });
      const res = await archiveMemo(item.name).catch(() => {
        //
      });

      if (res) {
        showToast(Toast.Style.Success, "Archive Success");

        revalidate();
      } else {
        showToast(Toast.Style.Failure, "Archive Failed");
      }
    }
  }

  async function onDelete(item: MemoInfoResponse) {
    if (
      await confirmAlert({
        title: "Are you sure?",
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      showToast({
        style: Toast.Style.Animated,
        title: "Delete...",
      });
      const res = await deleteMemo(item.name).catch(() => {
        //
      });

      if (res) {
        showToast(Toast.Style.Success, "Delete Success");

        revalidate();
      } else {
        showToast(Toast.Style.Failure, "Delete Failed");
      }
    }
  }

  async function onRestore(item: MemoInfoResponse) {
    if (
      await confirmAlert({
        title: "Are you sure?",
        icon: Icon.Redo,
        primaryAction: {
          title: "Restore",
          style: Alert.ActionStyle.Default,
        },
      })
    ) {
      showToast({
        style: Toast.Style.Animated,
        title: "Restore...",
      });
      const res = await restoreMemo(item.name).catch(() => {
        //
      });

      if (res) {
        showToast(Toast.Style.Success, "Restore Success");

        revalidate();
      } else {
        showToast(Toast.Style.Failure, "Restore Failed");
      }
    }
  }

  const archiveComponent = (item: MemoInfoResponse) => (
    <Action title="Archive" icon={Icon.Store} style={Action.Style.Destructive} onAction={() => onArchive(item)} />
  );

  const deleteComponent = (item: MemoInfoResponse) => (
    <Action title="Delete" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => onDelete(item)} />
  );

  const restoreComponent = (item: MemoInfoResponse) => (
    <Action title="Restore" icon={Icon.Redo} style={Action.Style.Regular} onAction={() => onRestore(item)} />
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Memos"
      searchBarPlaceholder="Search your memo..."
      isShowingDetail
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Dropdown With Items"
          onChange={(newValue) => {
            setState(newValue as ROW_STATUS);
          }}
        >
          <List.Dropdown.Item title={ROW_STATUS.NORMAL} value={ROW_STATUS.NORMAL} />
          <List.Dropdown.Item title={ROW_STATUS.ARCHIVED} value={ROW_STATUS.ARCHIVED} />
        </List.Dropdown>
      }
    >
      {filterList.map((item) => (
        <List.Item
          key={item.name}
          title={item.content}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getItemUrl(item)} />
              {(item.state === ROW_STATUS.NORMAL && archiveComponent(item)) || null}
              {(item.state === ROW_STATUS.ARCHIVED && restoreComponent(item)) || null}
              {(item.state === ROW_STATUS.ARCHIVED && deleteComponent(item)) || null}
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={item.markdown} />}
        />
      ))}
    </List>
  );
}
