import { Color, Icon, List } from "@raycast/api";
import { useMailerSend } from "./mailersend";
import { User } from "./interfaces";

export default function Users() {
  const { isLoading, data: users = [] } = useMailerSend<User[]>("users");

  return (
    <List isLoading={isLoading}>
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={user.avatar ?? Icon.Person}
          title={user.name}
          subtitle={user.email}
          accessories={[
            { tag: user["2fa"] ? { value: "2FA on", color: Color.Green } : { value: "2FA off", color: Color.Red } },
            { text: user.role },
          ]}
        />
      ))}
    </List>
  );
}
