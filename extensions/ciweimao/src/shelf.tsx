import { ActionPanel, Icon, List, PushAction, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { getShelfList } from "./api";
import Shelf from "./index";

interface State {
  shelves?: any[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  useEffect(() => {
    async function fetchData() {
      try {
        const res: any = await getShelfList();
        setState({ shelves: res.shelf_list });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }
    fetchData();
  }, []);
  if (state.error) {
    showToast(ToastStyle.Failure, "出错了", state.error.message);
  }
  async function setDefault(sid: string) {
    await setLocalStorageItem("sid", sid);
    showToast(ToastStyle.Success, "操作成功", "默认书架设置完毕");
  }
  return (
    <List isLoading={!state.shelves && !state.error}>
      {state.shelves?.map((item: any, index) => (
        <List.Item
          key={index}
          icon={Icon.TextDocument}
          title={item.shelf_name}
          actions={
            <ActionPanel>
              <PushAction
                icon={{ source: "../assets/shelf.png" }}
                title="打开书架"
                target={<Shelf shelf_id={item.shelf_id} />}
              />
              <ActionPanel.Item
                icon={{ source: "../assets/default.png" }}
                title="设为默认"
                onAction={() => setDefault(item.shelf_id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
