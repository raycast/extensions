import { Icon, List, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { User } from "./interfaces";
import { useToken } from "./instances";

export default function Users() {
  const { url, headers } = useToken();

  const { isLoading, data: users } = useFetch<User[], User[]>(url + "user.all", {
    headers,
    initialData: [],
  });

  return (
    <List navigationTitle="Users" isLoading={isLoading}>
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
