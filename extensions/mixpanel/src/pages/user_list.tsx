import { Action, ActionPanel, List, Icon } from "@raycast/api";
import MixpanelUser from "../model/user";
import UserDetail from "./user_detail";

export default function UserList(props: { users: MixpanelUser[] }) {
  return (
    <List>
      {props.users.map((u) => (
        <List.Item
          icon={Icon.Person}
          title={u.name}
          subtitle={u.email}
          key={u.id}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.AppWindow} target={<UserDetail user={u} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
