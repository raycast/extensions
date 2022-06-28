import { Icon, List } from "@raycast/api";
import { User } from "../../types";
import CopyToClipboardActionPanel from "../action-panels/copy-to-clipboard";

type Props = {
  user: User;
};

const UserListSection = ({ user }: Props) => {
  return (
    <List.Section title={`Account information`}>
      <List.Item
        title={`Username`}
        subtitle={user.username || undefined}
        icon={Icon.Clipboard}
        actions={<CopyToClipboardActionPanel text={user.username} />}
      />
      <List.Item
        title={`Name`}
        subtitle={user.name || undefined}
        icon={Icon.Clipboard}
        actions={<CopyToClipboardActionPanel text={user.name} />}
      />
      <List.Item
        title={`Email`}
        subtitle={user.email || undefined}
        icon={Icon.Clipboard}
        actions={<CopyToClipboardActionPanel text={user.email} />}
      />
      <List.Item
        title={`ID`}
        subtitle={user.uid || undefined}
        icon={Icon.Clipboard}
        actions={<CopyToClipboardActionPanel text={user.uid} />}
      />
    </List.Section>
  );
};

export default UserListSection;
