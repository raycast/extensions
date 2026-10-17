import { Icon, List, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { User } from "./interfaces";
import { type Instance, useInstanceScope } from "./instances";

export default function Users({ instance: initial }: { instance: Instance }) {
  const { url, headers, dropdown } = useInstanceScope(initial);

  const { isLoading, data: users } = useFetch<User[], User[]>(url + "user.all", {
    headers,
    initialData: [],
  });

  return (
    <List navigationTitle="Users" isLoading={isLoading} searchBarAccessory={dropdown}>
      {users.map((user) => (
        <List.Item
          key={user.userId}
          icon={Icon.Person}
          title={user.user.name}
          subtitle={user.user.email}
          accessories={[
            { tag: user.role },
            {
              tag: { value: "2FA", color: user.user.twoFactorEnabled ? Color.Green : Color.Red },
              tooltip: user.user.twoFactorEnabled ? "Enabled" : "Disabled",
            },
            { date: new Date(user.createdAt) },
          ]}
        />
      ))}
    </List>
  );
}
