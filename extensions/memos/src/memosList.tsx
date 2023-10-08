import { useEffect, useState } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { archiveMemo, deleteMemo, getAllMemos, getRequestUrl, restoreMemo } from "./api";
import { MemoInfoResponse, ROW_STATUS, ROW_STATUS_KEY } from "./types";

export default function MemosListCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [rowStatus, setRowStatus] = useState<ROW_STATUS_KEY>(ROW_STATUS.NORMAL);
  const { isLoading, data, revalidate } = getAllMemos(rowStatus);
  const [filterList, setFilterList] = useState<MemoInfoResponse[]>([]);

  const rowStatusList: ROW_STATUS_KEY[] = [ROW_STATUS.NORMAL, ROW_STATUS.ARCHIVED];

  const onRowStatusChange = (newValue: ROW_STATUS_KEY) => {
    setRowStatus(newValue);
    revalidate();
  };

  useEffect(() => {
    const dataList = data?.data || data || [];
    setFilterList(dataList.filter((item) => item.content.includes(searchText)) || []);
  }, [searchText]);

  useEffect(() => {
    const dataList = data?.data || data || [];
    setFilterList(dataList);
  }, [data]);

  function getItemUrl(item: MemoInfoResponse) {
    const url = getRequestUrl(`/m/${item.id}`);

    return url;
  }

  function getItemMarkdown(item: MemoInfoResponse) {
    const { content, resourceList } = item;
    let markdown = content;

    resourceList.forEach((resource, index) => {
      const resourceUrl = getRequestUrl(`/o/r/${resource.id}?thumbnail=1`);

      if (index === 0) {
        markdown += "\n\n";
      }

      markdown += ` ![${resource.filename}](${resourceUrl})`;
    });

    return markdown;
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
      const res = await archiveMemo(item.id).catch(() => {
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
      const res = await deleteMemo(item.id).catch(() => {
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
      const res = await restoreMemo(item.id).catch(() => {
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
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Row Status"
          storeValue={true}
          onChange={(newValue) => {
            onRowStatusChange(newValue as ROW_STATUS_KEY);
          }}
        >
          <List.Dropdown.Section title="Row Status">
            {rowStatusList.map((status) => (
              <List.Dropdown.Item key={status} title={status} value={status} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filterList.map((item) => (
        <List.Item
          key={item.id}
          title={item.content}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getItemUrl(item)} />
              {(item.rowStatus === ROW_STATUS.NORMAL && archiveComponent(item)) || null}
              {(item.rowStatus === ROW_STATUS.ARCHIVED && restoreComponent(item)) || null}
              {(item.rowStatus === ROW_STATUS.ARCHIVED && deleteComponent(item)) || null}
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={getItemMarkdown(item)} />}
        />
      ))}
    </List>
  );
}
