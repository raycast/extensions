import { List } from "@raycast/api";
import { useState } from "react";
import { useMe, useSubscriptions } from "./lib/hooks";
import { ItemListDetail } from "./components/Item/ItemDetail";

export default function Login() {
  const { isLoading: isLogging, data: userResponse, error } = useMe();

  // TODO: do page navigation or load more
  const [page, setPage] = useState(1);

  const fetchSubscriptions = !error && !!userResponse;

  const { isLoading, data: { data = [] } = {} } = useSubscriptions(page, fetchSubscriptions);

  const isListLoading = isLoading || isLogging;

  return (
    <List isLoading={isListLoading} isShowingDetail={true}>
      {data.map((item: any) => (
        <ItemListDetail key={item.id} item={item} />
      ))}
    </List>
  );
}
