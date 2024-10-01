import { getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PreferenceValues, MemoListProps, Memo } from "./lib/types";
import { getSummaryStream } from "./lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";

function getMemoItemsStream(memos: Memo[], isLoadingMemos: boolean) {
  const [memoItems, setMemoItems] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const updateCount = useRef(0);

  const items: { [key: string]: string } = {};
  const getMemoItems = useCallback(async () => {
    await Promise.all(
      memos.map(async (memo) => {
        items[memo.uid] = "";
        const stream = await getSummaryStream(memo);
        for await (const title of stream) {
          items[memo.uid] = title;
          setMemoItems({ ...items });
        }
      })
    );
    setIsLoading(false);
  }, [memos]);
  useEffect(() => {
    if (updateCount.current < 2) {
      updateCount.current += 1;
    } else {
      getMemoItems();
    }
  }, [isLoadingMemos]);
  return { isLoading, memoItems };
}

export default function listMemos() {
  const { memosServerUrl, memosServerToken } = getPreferenceValues<PreferenceValues>();

  const { isLoading, data } = useFetch<MemoListProps>(`${memosServerUrl}/api/v1/memos`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${memosServerToken}`,
    },
  });
  const memos = data?.memos || [];
  const { isLoading: isLoadingMemoItems, memoItems } = getMemoItemsStream(memos, isLoading);
  return (
    <List isLoading={isLoadingMemoItems} throttle>
      {Object.entries(memoItems).map(([uid, title]) => (
        <List.Item
          key={uid}
          title={title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${memosServerUrl}/m/${uid}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
