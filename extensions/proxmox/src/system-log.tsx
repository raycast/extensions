import { List } from "@raycast/api";
import { useMultiPveFetch } from "@/hooks/use-multi-pve-fetch";
import { NoServersEmptyView } from "@/components/NoServersEmptyView";
import { ServerErrorItem } from "@/components/ServerErrorItem";
import { Journal } from "@/screens/Journal";

const Command = () => {
  const { data, servers, isLoading, revalidate } = useMultiPveFetch<{ node: string }[]>("api2/json/nodes", {
    timerInterval: null,
  });
  const results = data ?? [];
  const nodes = results.flatMap((result) => (result.data ?? []).map(({ node }) => ({ server: result.server, node })));
  const failedServers = results.flatMap(({ server, error }) => (error !== undefined ? [{ server, error }] : []));

  if (nodes.length > 0) {
    return <Journal nodes={nodes} failedServers={failedServers} retryServers={revalidate} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && servers.length === 0 ? (
        <NoServersEmptyView />
      ) : (
        failedServers.map(({ server, error }) => (
          <ServerErrorItem key={`${server.id}/error`} server={server} error={error} revalidate={revalidate} />
        ))
      )}
    </List>
  );
};

export default Command;
