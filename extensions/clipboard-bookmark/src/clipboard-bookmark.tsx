import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  List,
  LocalStorage,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

interface Value {
  title: string;
  value: string;
}

interface Item extends Value {
  number: string;
}

type Items = [string, Item][];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Items>();

  const bookmarkList = items?.filter(
    ([_, v]) =>
      v.value.toLowerCase().includes(searchText.toLowerCase()) ||
      v.title.toLowerCase().includes(searchText.toLowerCase()) ||
      searchText === v.number
  );

  async function fetchStorage() {
    try {
      const res = await LocalStorage.allItems();
      const allItems = Object.entries(res);
      const finalRes: Items = [];
      allItems.forEach(([key, value], i) => {
        const parsedValue: Value = JSON.parse(value);
        finalRes.push([key, { number: String(i + 1), ...parsedValue }]);
      });
      setItems(finalRes);
    } catch (e) {
      const error = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to load storage",
        message: error.message,
      });
    }
  }

  async function addBookmark(value: string) {
    try {
      await LocalStorage.setItem(
        uuidv4(),
        JSON.stringify({
          title: value,
          value,
        })
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Added to bookmarks",
      });
      await fetchStorage();
      setSearchText("");
      await showHUD("Added to bookmarks");
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    } catch (e) {
      const error = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to save your bookmark",
        message: error.message,
      });
    }
  }

  async function removeBookmark(key: string) {
    try {
      await LocalStorage.removeItem(key);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from bookmarks",
      });
      await fetchStorage();
      setSearchText("");
    } catch (e) {
      const error = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to remove your bookmark",
        message: error.message,
      });
    }
  }

  async function removeAllBookmark() {
    try {
      await LocalStorage.clear();
      await showToast({
        style: Toast.Style.Success,
        title: "All bookmarks removed",
      });
      await fetchStorage();
      setSearchText("");
    } catch (e) {
      const error = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to remove your bookmark",
        message: error.message,
      });
    }
  }

  useEffect(() => {
    fetchStorage();
  }, []);

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Clipboard Bookmark"
      searchBarPlaceholder="Search or add a bookmark..."
      isLoading={items === undefined}
    >
      {bookmarkList?.length === 0 || !bookmarkList ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                title="Add"
                onAction={async () => {
                  addBookmark(searchText);
                }}
              />
            </ActionPanel>
          }
          title="Nothing found, add a bookmark?"
        />
      ) : (
        bookmarkList &&
        bookmarkList.map(([key, v]) => (
          <List.Item
            key={key}
            subtitle={v.number}
            title={v.title}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to clipboard" content={v.value} />
                <Action
                  title="Remove"
                  onAction={async () => {
                    removeBookmark(key);
                  }}
                />
                <Action
                  title="Remove All"
                  onAction={async () => {
                    removeAllBookmark();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
