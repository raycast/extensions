import { useEffect, useState } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { archiveMemo, getAllMemos, getRequestUrl } from "./api";
import { MemoInfoResponse, ROW_STATUS, ROW_STATUS_KEY } from "./types";

export default function MemosListCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [rowStatus, setRowStatus] = useState<ROW_STATUS_KEY>(ROW_STATUS.NORMAL);
  const { isLoading, data, revalidate } = getAllMemos(rowStatus);
  const [filterList, setFilterList] = useState<MemoInfoResponse[]>([]);

  useEffect(() => {
    setFilterList(data?.data?.filter((item) => item.content.includes(searchText)) || []);
  }, [searchText]);

  useEffect(() => {
    setFilterList(data?.data || []);
  }, [data]);

  function getItemUrl(item: MemoInfoResponse) {
    const url = getRequestUrl(`/m/${item.id}`);

    return url;
  }

  function getItemMarkdown(item: MemoInfoResponse) {
    const { content, resourceList } = item;
    let markdown = content;

    resourceList.forEach((resource, index) => {
      const resourceUrl = getRequestUrl(`/o/r/${resource.id}/${resource.filename}`);

      if (index === 0) {
        markdown += "\n\n";
      }

      markdown += ` ![${resource.filename}](${resourceUrl})`;
    });

    return markdown;
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
        title: "delete...",
      });
      const res = await archiveMemo(item.id).catch(() => {
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

  const rowStatusList: ROW_STATUS_KEY[] = [ROW_STATUS.NORMAL, ROW_STATUS.ARCHIVED];

  const onRowStatusChange = (newValue: ROW_STATUS_KEY) => {
    setRowStatus(newValue);
    revalidate();
  };

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
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => onDelete(item)}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={getItemMarkdown(item)} />}
        />
      ))}
    </List>
  );
}
