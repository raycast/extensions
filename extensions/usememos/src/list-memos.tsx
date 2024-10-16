import { getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { MemoListProps, MemoWithSummary } from "./lib/types";
import { getSummaryStream } from "./lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";

function getMemoItemsStream(memosServerUrl: string, memosServerToken: string) {
  const { isLoading: isLoadingMemosData, data: memosData } = useFetch<MemoListProps>(
    `${memosServerUrl}/api/v1/memos?pageSize=30`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${memosServerToken}`,
      },
    }
  );
  const memos = memosData?.memos || [];
  const [memoItems, setMemoItems] = useState<{
    [key: string]: MemoWithSummary;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const updateCount = useRef(0);

  const items: { [key: string]: MemoWithSummary } = {};
  const getMemoItems = useCallback(async () => {
    await Promise.all(
      memos.map(async (memo) => {
        items[memo.uid] = { ...memo, summary: "" };
        const stream = await getSummaryStream(memo);
        for await (const summary of stream) {
          items[memo.uid] = { ...items[memo.uid], summary };
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
  }, [isLoadingMemosData]);
  return { isLoading, memoItems: Object.values(memoItems) };
}

function MemoListItem({ memo }: { memo: MemoWithSummary }) {
  const { memosServerUrl } = getPreferenceValues<Preferences.ListMemos>();
  return (
    <List.Item
      title={memo.summary}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${memosServerUrl}/m/${memo.uid}`} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={memo.content}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Summary" text={memo.summary} />
              <List.Item.Detail.Metadata.Label title="Tags" text={memo.tags.join(", ")} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created At" text={`${memo.createTime}`} />
              <List.Item.Detail.Metadata.Label title="Updated At" text={`${memo.updateTime}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

export default function listMemos() {
  const { memosServerUrl, memosServerToken } = getPreferenceValues<Preferences.ListMemos>();

  const { isLoading: isLoadingMemoItems, memoItems } = getMemoItemsStream(memosServerUrl, memosServerToken);
  return (
    <List isLoading={isLoadingMemoItems} isShowingDetail={true} throttle>
      <List.Section title="Pinned">
        {memoItems
          .filter((memo) => memo.pinned && memo.rowStatus === "ACTIVE")
          .map((memo) => (
            <MemoListItem key={memo.uid} memo={memo} />
          ))}
      </List.Section>
      <List.Section title="Common">
        {memoItems
          .filter((memo) => !memo.pinned && memo.rowStatus === "ACTIVE")
          .map((memo) => (
            <MemoListItem key={memo.uid} memo={memo} />
          ))}
      </List.Section>
      <List.Section title="Archived">
        {memoItems
          .filter((memo) => memo.rowStatus === "ARCHIVED")
          .map((memo) => (
            <MemoListItem key={memo.uid} memo={memo} />
          ))}
      </List.Section>
    </List>
  );
}
