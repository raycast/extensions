import { useEffect, useRef } from "react";
import { List, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { withPutioClient } from "./api/withPutioClient";
import { fetchTransfers } from "./api/transfers";
import { TransferListItem } from "./components/TransferListItem";
import { localizeError, localizedErrorToToastOptions } from "./api/localizeError";
import { EmptyView } from "./components/EmptyView";

export const Transfers = () => {
  const intervalRef = useRef<NodeJS.Timeout>();

  const { isLoading, data, error, revalidate } = usePromise(fetchTransfers, [], {
    onData: () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(revalidate, 3000);
      }
    },
  });

  useEffect(() => {
    if (error) {
      showToast(localizedErrorToToastOptions(localizeError(error)));
    }
  }, [error]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search in transfers">
      <EmptyView title={data && data?.transfers.length === 0 ? "No transfers" : "Transfers"} />
      {data?.transfers.map((transfer) => <TransferListItem key={transfer.id} transfer={transfer} />)}
    </List>
  );
};

export default function Command() {
  return withPutioClient(<Transfers />);
}
