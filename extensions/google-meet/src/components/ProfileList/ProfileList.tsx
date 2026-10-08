import { ActionPanel, Action, showHUD, showToast, Toast, List } from "@raycast/api";
import { FC, useCallback } from "react";
import { reportMeetFailure } from "../../errors";
import { useCacheHelpers } from "../../hooks";
import { createMeeting, formatSuccessMessage } from "../../services/create-meeting";

type ProfileListProps = {
  refocus?: boolean;
};

export const ProfileList: FC<ProfileListProps> = ({ refocus = false }) => {
  const { profiles, onRemoveItem } = useCacheHelpers();

  const onSelect = useCallback(
    async (email: string) => {
      try {
        const result = await createMeeting({ profile: email, refocus });
        await showHUD(formatSuccessMessage(result));
      } catch (error) {
        await reportMeetFailure(error, "Create Meet with Specified Profile");
      }
    },
    [refocus],
  );

  const onRemove = useCallback(
    (email: string) => {
      onRemoveItem(email);

      showToast({
        style: Toast.Style.Success,
        title: "Profile removed!",
      });
    },
    [onRemoveItem],
  );

  return (
    <>
      {profiles.map(({ email, name }) => (
        <List.Item
          key={email}
          id={email}
          title={name}
          subtitle={email}
          actions={
            <ActionPanel>
              <Action title="Select Profile" onAction={() => onSelect(email)} />
              <Action title="Delete Profile" onAction={() => onRemove(email)} />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
};
