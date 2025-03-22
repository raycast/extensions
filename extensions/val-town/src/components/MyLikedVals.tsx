import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useProfile } from "../hooks/useProfile";
import { UserLikesList } from "./UserLikesList";

export const MyLikedVals = () => {
  const { profile } = useProfile();
  return (
    <List.Item
      id="my-liked-vals"
      icon={Icon.Heart}
      title="My Liked Vals"
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} title="View Your Liked Vals" target={<UserLikesList userId={profile?.id} />} />
        </ActionPanel>
      }
    />
  );
};
