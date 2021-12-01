import { ActionPanel, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";

import { getCatalog } from "./api";
import Chapter from "./chapter";

interface State {
  cpts?: any[];
  error?: Error;
}

export function Catalog(props: { book_id: string; current?: number }) {
  const [state, setState] = useState<State>({});
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getCatalog(props.book_id);
        setState({ ...state, cpts: res });
      } catch (error) {
        setState({ ...state, error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }
    fetchData();
  }, []);
  if (state.error) {
    showToast(ToastStyle.Failure, "出错了", state.error.message);
  }
  async function refresh() {
    setState({ ...state, cpts: undefined });
    const res = await getCatalog(props.book_id);
    setState({ ...state, cpts: res });
  }
  return (
    <List isLoading={!state.cpts && !state.error}>
      {state.cpts?.map((item: any, index) => (
        <List.Item
          key={index}
          icon={Icon.TextDocument}
          title={item.chapter_title}
          actions={
            <ActionPanel>
              <PushAction
                icon={{ source: "../assets/open.png" }}
                title="打开"
                target={<Chapter book_id={props.book_id} current={index} />}
              />
              <ActionPanel.Item
                icon={{ source: "../assets/refresh.png" }}
                title="更新目录"
                onAction={() => refresh()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
