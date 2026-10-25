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

  if (nodes.length > 0) {
    return <Journal nodes={nodes} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && servers.length === 0 ? (
        <NoServersEmptyView />
      ) : (
        results
          .filter((result) => result.error !== undefined)
          .map((result) => (
            <ServerErrorItem
              key={`${result.server.id}/error`}
              server={result.server}
              error={result.error ?? ""}
              revalidate={revalidate}
            />
          ))
      )}
    </List>
  );
};

export default Command;
