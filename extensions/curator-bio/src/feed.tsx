import { List } from "@raycast/api";
import { useMe, useSubscriptions } from "./lib/hooks";
import { ItemListDetail } from "./components/Item/ItemDetail";
import ErrorView from "./components/ErrorView";

export default function Login() {
  const { isLoading: isMeLoading, data: userResponse, error } = useMe();

  const fetchSubscriptions = !error && !!userResponse;

  const { isLoading, data: { data = [] } = {} } = useSubscriptions(1, fetchSubscriptions);

  const isListLoading = isMeLoading || isLoading;

  if (error) {
    return <ErrorView error={error} />;
  } else {
    return (
      <List isLoading={isListLoading} isShowingDetail={true}>
        {data.map((item: any) => (
          <ItemListDetail key={item.id} item={item} />
        ))}
      </List>
    );
  }
}
