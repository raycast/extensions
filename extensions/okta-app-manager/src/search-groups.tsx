import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { OktaGroup, adminGroupUrl, searchGroups } from "./api/groups";
import EditGroup from "./views/EditGroup";

import { getCurrentEnv } from "./api/config";

export default function SearchGroups() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<OktaGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const env = getCurrentEnv();
  const envName = env ? env.name : "No Environment Selected";

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!query) {
        setGroups([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchGroups(query);
        if (!alive) return;
        setGroups(results);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!alive) return;
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message: e?.message || "Unknown error" });
        setGroups([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    const t = setTimeout(run, 300);
    return () => {
      clearTimeout(t);
      alive = false;
    };
  }, [query]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search groups by name... (${envName})`}
      onSearchTextChange={setQuery}
      throttle
    >
      {groups.map((group) => {
        const name = group.profile.name;
        const description = group.profile.description || "";
        const type = group.type;
        const url = adminGroupUrl(group.id);

        return (
          <List.Item
            key={group.id}
            title={name}
            subtitle={description}
            accessories={[{ text: type }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID" content={group.id} />
                <Action.CopyToClipboard title="Copy Name" content={name} />
                <Action.Push title="Edit Group" icon={Icon.Pencil} target={<EditGroup groupId={group.id} />} />
                {url ? <Action.OpenInBrowser title="Open in Admin Console" url={url} /> : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
