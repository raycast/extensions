import { ActionPanel, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import Chapter from "./chapter";
import { favor, getShelfList, searchBook } from "./api";
import { Catalog } from "./catalog";

interface State {
  items?: any[];
  key?: string;
  shelves?: any[];
  isLoading?: boolean;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true, shelves: [] });
  useEffect(() => {
    async function fetchData() {
      const shelves: any = await getShelfList();
      setState({ ...state, shelves: shelves.shelf_list });
    }
    fetchData();
  }, []);

  async function setKey(key: string) {
    if (key === "") {
      setState({ ...state, items: [], isLoading: false });
      return;
    }
    const res: any = await searchBook(key);
    setState({ ...state, items: res.book_list, isLoading: false });
  }

  async function add(bid: string, sid: string) {
    const res = await favor(bid, sid);
    if (res) showToast(ToastStyle.Success, "Success", "Added Successfully");
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search books via title or author……"
      throttle={true}
      onSearchTextChange={setKey}
    >
      {state.items?.map((item: any, index) => (
        <List.Item
          key={index}
          icon={Icon.TextDocument}
          title={item.book_name}
          actions={
            <ActionPanel>
              <PushAction
                icon={{ source: "../assets/open.png" }}
                title="Read Book"
                target={<Chapter book_id={item.book_id} />}
              />
              <PushAction
                icon={{ source: "../assets/catalog.png" }}
                title="View Catalog"
                target={<Catalog book_id={item.book_id} />}
              />
              <ActionPanel.Submenu title="Add To Bookshelf" icon={{ source: "../assets/add.png" }}>
                {state.shelves!.map((shelf: any) => (
                  <ActionPanel.Item
                    key={shelf.shelf_id}
                    icon={{ source: Icon.Circle }}
                    title={shelf.shelf_name}
                    onAction={() => add(item.book_id, shelf.shelf_id)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
