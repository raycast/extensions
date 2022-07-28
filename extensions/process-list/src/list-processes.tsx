import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ProcessListProvider } from "./list-processes/context";
import { SortDropdown, SortKey } from "./list-processes/dropdown";
import { ProcessListItem } from "./list-processes/item";
import { useProcessList } from "./list-processes/use-search";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  "live-refresh": boolean;
}

export default function Command() {
  const [sort, setSort] = useState<SortKey>("cpu");
  const { state, refresh } = useProcessList(sort);
  const [showDetail, setShowDetail] = useState(false);
  const { "live-refresh": liveRefresh } = getPreferenceValues<Preferences>();

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (showDetail || !liveRefresh) return;
    const interval = setInterval(refresh, 5000);

    return () => clearInterval(interval);
  }, [refresh, showDetail]);

  const items = state.processes.map((processItem, i) => (
    <ProcessListItem key={processItem.pid} processItem={processItem} index={`${i}`} />
  ));

  return (
    <ProcessListProvider
      setShowingDetail={setShowDetail}
      showDetail={showDetail}
      refresh={refresh}
      totalMemory={state.totalMemory}
    >
      <List
        isLoading={state.loading}
        isShowingDetail={showDetail}
        searchBarPlaceholder="Search processes..."
        searchBarAccessory={<SortDropdown sort={sort} onChange={(s: string) => setSort(s as SortKey)} />}
        throttle
      >
        {state.processes.length === 0 ? <List.EmptyView title="No processes found" /> : items}
      </List>
    </ProcessListProvider>
  );
}
