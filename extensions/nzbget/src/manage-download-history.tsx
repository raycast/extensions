import { useFetch } from "@raycast/utils";
import { getAPIURL } from "./lib/get-preferences";
import type { ListGroupsResult } from "./lib/downloads";
import { useEffect } from "react";
import { Color, List } from "@raycast/api";

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<ListGroupsResult>(getAPIURL("/jsonrpc/history"), {});

  useEffect(() => {
    const interval = setInterval(revalidate, 1000);
    return () => clearInterval(interval);
  }, [revalidate]);

  return (
    <List isLoading={isLoading}>
      {data?.result.map((group) => (
        <List.Item
          key={group.NZBID}
          title={group.NZBName}
          accessories={[
            { tag: { value: group.MoveStatus, color: Color.Green } },
            { tag: { value: `${group.FileSizeMB} MB`, color: Color.Blue } },
            { tag: { value: group.Category, color: Color.Red } },
          ]}
        />
      ))}
    </List>
  );
}
