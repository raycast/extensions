import { ActionPanel, getLocalStorageItem, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import Chapter from "./chapter";
import { deleteShelfBook, getShelfBookList, getShelfList } from "./api";
import { Catalog } from "./catalog";

interface State {
  items?: any[];
  current?: string;
  error?: Error;
}

export default function Command(props: { shelf_id?: string }) {
  const [state, setState] = useState<State>({});
  useEffect(() => {
    async function fetchData() {
      try {
        if (!props.shelf_id) {
          const sid = await getLocalStorageItem("sid");
          if (sid) {
            state.current = String(sid);
          } else {
            const shelves: any = await getShelfList();
            state.current = shelves.shelf_list[0].shelf_id;
          }
        } else {
          state.current = props.shelf_id;
        }
        refresh();
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }
    fetchData();
  }, []);
  if (state.error) {
    showToast(ToastStyle.Failure, "出错了", state.error.message);
  }
  async function delBook(bid: string) {
    await deleteShelfBook(bid, state.current!);
    refresh();
  }
  async function refresh() {
    const res: any = await getShelfBookList(state.current!);
    setState({ items: res.book_list, current: state.current });
  }
  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item: any, index) => (
        <List.Item
          key={index}
          icon={Icon.TextDocument}
          title={item.book_info.book_name}
          actions={
            <ActionPanel>
              <PushAction
                icon={{ source: "../assets/open.png" }}
                title="打开书籍"
                target={<Chapter book_id={item.book_info.book_id} cid={item.last_read_chapter_id} />}
              />
              <PushAction
                icon={{ source: "../assets/catalog.png" }}
                title="查看目录"
                target={<Catalog book_id={item.book_info.book_id} />}
              />
              {/* <PushAction
                icon={{ source: "../assets/detail.png" }}
                title="查看详情"
                target={<Chapter book_id={item.book_info.book_id} />}
              /> */}
              <ActionPanel.Item
                icon={{ source: "../assets/delete.png" }}
                title="删除书籍"
                onAction={() => delBook(item.book_info.book_id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
