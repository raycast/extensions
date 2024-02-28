import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useProfile } from "../hooks/useProfile";
import { UserReferencedList } from "./UserReferencedList";

export const MyReferencedVals = () => {
  const { profile } = useProfile();
  return (
    <List.Item
      id="my-referenced-vals"
      icon={Icon.Link}
      title="Vals Referencing Mine"
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="View Your Referenced Vals"
            target={<UserReferencedList userId={profile?.id} />}
          />
        </ActionPanel>
      }
    />
  );
};
