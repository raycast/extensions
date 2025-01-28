import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { ListItemRequest } from "./components/ListItemRequest";
import { useStorage } from "./hooks/storage";
import { Requests } from "./types/request";
import { StorageKey } from "./types/storage";
import { getRequestsHelpersFactory } from "./utils/request";
import { CreateRequest } from "./views/CreateRequest";

export default function ManageCommand() {
  const {
    value: requests,
    setValue: setRequests,
    removeValue: clearRequests,
    refetch: refetchRequests,
  } = useStorage<Requests>({ key: StorageKey.REQUESTS, initialValue: {} });

  const requestHelpersFactory = getRequestsHelpersFactory({
    requests,
    setRequests,
  });

  const favorites: Requests = useMemo(
    () => Object.fromEntries(Object.entries(requests).filter(([, request]) => request.favorite)),
    [requests],
  );

  function renderRequests(requestsToRender: Requests) {
    return Object.values(requestsToRender).map((request) => (
      <ListItemRequest
        key={request.id}
        request={request}
        requests={requests}
        setRequests={setRequests}
        clearRequests={clearRequests}
        refetchRequests={refetchRequests}
        helpers={requestHelpersFactory(request)}
      />
    ));
  }

  return (
    <List isShowingDetail={Object.keys(requests).length > 0}>
      <List.EmptyView
        title="No Requests Yet"
        description="Please create some Requests first"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Request"
              target={<CreateRequest requests={requests} setRequests={setRequests} />}
            />
          </ActionPanel>
        }
      />
      {Object.keys(favorites).length > 0 && <List.Section title="Favorites">{renderRequests(favorites)}</List.Section>}
      <List.Section title="Requests">{renderRequests(requests)}</List.Section>
    </List>
  );
}
