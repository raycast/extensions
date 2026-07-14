import { useEffect, useMemo, useRef, useState } from "react";
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
import { MemoInfoResponse, MeResponse, ROW_STATUS } from "./types";

export default function MemosListCommand() {
  const [searchText, setSearchText] = useState("");
  const [currentUserName, setCurrentUserName] = useState<string>();
  const [state, setState] = useState(ROW_STATUS.NORMAL);
  const { isLoading, data, revalidate, pagination } = getAllMemos(currentUserName, { state });
  const { isLoading: isLoadingUser, data: userData } = getMe();
  const [markdownByMemoName, setMarkdownByMemoName] = useState<Record<string, string>>({});
  const loadingMarkdownMemoNames = useRef(new Set<string>());

  useEffect(() => {
    if (!isLoadingUser && userData && "user" in userData) {
      const user = (userData as MeResponse).user;
      if (user && user.name) {
        setCurrentUserName(user.name);
      }
    }
  }, [isLoadingUser, userData]);

  useEffect(() => {
    const dataList = data || [];
    for (const item of dataList) {
      if (
        item.attachments.length === 0 ||
        markdownByMemoName[item.name] ||
        loadingMarkdownMemoNames.current.has(item.name)
      ) {
        continue;
      }

      loadingMarkdownMemoNames.current.add(item.name);
      void getItemMarkdown(item).finally(() => {
        loadingMarkdownMemoNames.current.delete(item.name);
      });
    }
  }, [data, markdownByMemoName]);

  const filterList = useMemo(() => {
    return (data || [])
      .filter((item) => item.content.includes(searchText))
      .map((item) => ({
        ...item,
        markdown: markdownByMemoName[item.name] ?? item.content,
      }));
  }, [data, markdownByMemoName, searchText]);

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

    setMarkdownByMemoName((prev) => {
      if (prev[item.name] === markdown) {
        return prev;
      }

      return {
        ...prev,
        [item.name]: markdown,
      };
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
      isLoading={isLoading || isLoadingUser}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Memos"
      searchBarPlaceholder="Search your memo..."
      isShowingDetail
      pagination={pagination!}
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
          detail={<List.Item.Detail markdown={item.markdown ?? null} />}
        />
      ))}
    </List>
  );
}
