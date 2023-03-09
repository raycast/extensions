import { Action, ActionPanel, List } from "@raycast/api";
import MixpanelUser from "../model/user";
import UserDetail from "./user_detail";

export default function UserList(props: { users: MixpanelUser[] }) {
  return (
    <List>
      {props.users.map((u) => (
        <List.Item
          title={u.name}
          subtitle={u.email}
          key={u.id}
          actions={
            <ActionPanel>
              <Action.Push title="Open details" target={<UserDetail user={u} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
