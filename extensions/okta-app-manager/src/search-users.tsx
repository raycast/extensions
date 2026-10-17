import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { OktaUser, adminUserUrl, searchUsers } from "./api/users";
import EditUser from "./views/EditUser";

import { getCurrentEnv } from "./api/config";

export default function SearchUsers() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<OktaUser[]>([]);
  const [loading, setLoading] = useState(false);

  const env = getCurrentEnv();
  const envName = env ? env.name : "No Environment Selected";

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!query) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchUsers(query);
        if (!alive) return;
        setUsers(results);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!alive) return;
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message: e?.message || "Unknown error" });
        setUsers([]);
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
      searchBarPlaceholder={`Search users by name or email... (${envName})`}
      onSearchTextChange={setQuery}
      throttle
    >
      {users.map((user) => {
        const name = `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.profile.email;
        const email = user.profile.email;
        const status = user.status;
        const url = adminUserUrl(user.id);

        return (
          <List.Item
            key={user.id}
            title={name}
            subtitle={email}
            accessories={[{ text: status }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID" content={user.id} />
                <Action.CopyToClipboard title="Copy Email" content={email} />
                <Action.Push title="Edit User" icon={Icon.Pencil} target={<EditUser userId={user.id} />} />
                {url ? <Action.OpenInBrowser title="Open in Admin Console" url={url} /> : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
