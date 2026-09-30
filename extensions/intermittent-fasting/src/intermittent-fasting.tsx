import { ActionPanel, List } from "@raycast/api";
import { getItems, startItem } from "./storage";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { FastingView } from "./components/FastingView";
import { EmptyView } from "./components/EmptyView";
import { EatingView } from "./components/EatingView";
import { stopTimer } from "./utils";
import { StartFasting } from "./components/actions/startFasting";
import { FastingItem, EnhancedItem } from "./types";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(getItems);
  const runningFast = useMemo<FastingItem | undefined>(() => data?.find((item) => item.end === null), [data]);

  const handleStopTimer = async (fast: FastingItem): Promise<void> => {
    await stopTimer(fast, handleRevalidate);
  };

  const handleRevalidate = async (): Promise<EnhancedItem[]> => {
    revalidate();
    return await getItems();
  };

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      actions={
        <ActionPanel>
          {!runningFast && <StartFasting startItem={startItem} revalidate={handleRevalidate} />}
        </ActionPanel>
      }
    >
      {!data?.length ? (
        <EmptyView startItem={startItem} revalidate={handleRevalidate} />
      ) : runningFast ? (
        <FastingView
          runningFast={runningFast}
          data={data}
          stopTimer={handleStopTimer}
          revalidate={handleRevalidate}
          isLoading={isLoading}
        />
      ) : (
        <EatingView data={data} revalidate={handleRevalidate} isLoading={isLoading} />
      )}
    </List>
  );
}
