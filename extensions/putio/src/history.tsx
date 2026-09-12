import { useEffect } from "react";
import { Detail, List, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchHistoryEvents } from "./api/history";
import { getPutioAccountInfo, withPutioClient } from "./api/withPutioClient";
import { HistoryListItem } from "./components/HistoryListItem";
import { localizeError, localizedErrorToToastOptions } from "./api/localizeError";
import { EmptyView } from "./components/EmptyView";

const HistoryList = () => {
  const { data: events, isLoading, error } = usePromise(fetchHistoryEvents);

  useEffect(() => {
    if (error) {
      showToast(localizedErrorToToastOptions(localizeError(error)));
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search in history">
      <EmptyView title={events && events?.length === 0 ? "No events" : "History"} />

      {events
        ?.filter((e) => e.type === "transfer_completed" || e.type === "file_shared")
        .map((event) => <HistoryListItem key={event.id} event={event} />)}
    </List>
  );
};

const History = () => {
  const accountInfo = getPutioAccountInfo();

  if (accountInfo.settings.history_enabled) {
    return <HistoryList />;
  }

  return <Detail markdown="History is disabled in your put.io account settings." />;
};

export default function Command() {
  return withPutioClient(<History />);
}
