import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useProfile } from "../hooks/useProfile";
import { UserValsList } from "./UserValsList";

export const MyVals = () => {
  const { profile } = useProfile();
  return (
    <List.Item
      id="my-vals"
      icon={{
        source: profile?.profileImageUrl ?? Icon.Person,
        fallback: Icon.Person,
        mask: Image.Mask.Circle,
      }}
      title="My Vals"
      subtitle={profile?.username}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} title="View Your Vals" target={<UserValsList userId={profile?.id} />} />
        </ActionPanel>
      }
    />
  );
};
