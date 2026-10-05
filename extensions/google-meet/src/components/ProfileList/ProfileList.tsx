import { ActionPanel, Action, Icon, showHUD, showToast, Toast, List } from "@raycast/api";
import { FC, useCallback } from "react";
import { reportMeetFailure } from "../../errors";
import { GoogleProfile, useCacheHelpers } from "../../hooks";
import { createMeeting, formatSuccessMessage } from "../../services/create-meeting";
import {
  getLaunchTargetLabel,
  profileLaunchTargetChoices,
  toLaunchTarget,
  toLaunchTargetChoice,
} from "../launch-target-options";

type ProfileListProps = {
  refocus?: boolean;
};

export const ProfileList: FC<ProfileListProps> = ({ refocus = false }) => {
  const { profiles, onRemoveItem, onUpdateLaunchTarget } = useCacheHelpers();

  const onSelect = useCallback(
    async ({ email, launchTarget }: GoogleProfile) => {
      try {
        const result = await createMeeting({ profile: email, refocus, launchTarget });
        await showHUD(formatSuccessMessage(result));
      } catch (error) {
        await reportMeetFailure(error, "Create Meet with Specified Profile");
      }
    },
    [refocus],
  );

  const onSetLaunchTarget = useCallback(
    (email: string, choice: string) => {
      onUpdateLaunchTarget(email, toLaunchTarget(choice));

      showToast({
        style: Toast.Style.Success,
        title: "Profile updated!",
      });
    },
    [onUpdateLaunchTarget],
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
      {profiles.map((profile) => {
        const { email, name, launchTarget } = profile;
        const launchTargetLabel = getLaunchTargetLabel(launchTarget);
        const currentChoice = toLaunchTargetChoice(launchTarget);

        return (
          <List.Item
            key={email}
            id={email}
            title={name}
            subtitle={email}
            accessories={launchTargetLabel ? [{ tag: launchTargetLabel, tooltip: "Opens In" }] : []}
            actions={
              <ActionPanel>
                <Action title="Select Profile" onAction={() => onSelect(profile)} />
                <ActionPanel.Submenu title="Set Where Meetings Open" icon={Icon.AppWindow}>
                  {profileLaunchTargetChoices.map(({ value, title }) => (
                    <Action
                      key={value}
                      title={title}
                      icon={value === currentChoice ? Icon.Checkmark : undefined}
                      onAction={() => onSetLaunchTarget(email, value)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action title="Delete Profile" onAction={() => onRemove(email)} />
              </ActionPanel>
            }
          />
        );
      })}
    </>
  );
};
