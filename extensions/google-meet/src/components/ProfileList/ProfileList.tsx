import { ActionPanel, Action, showHUD, Clipboard, showToast, Toast, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { FC, useCallback } from "react";
import { getMeetTab, openMeetTabSelectedProfile, getTimeout, sleep, switchToPreviousApp } from "../../helpers";
import { useCacheHelpers } from "../../hooks";

type ProfileListProps = {
  refocus?: boolean;
};

export const ProfileList: FC<ProfileListProps> = ({ refocus = false }) => {
  const { profiles, onRemoveItem } = useCacheHelpers();

  const onSelect = useCallback(
    async (email: string) => {
      try {
        await openMeetTabSelectedProfile(email);

        const timeout = getTimeout();
        await sleep(timeout);

        const meetTab = await getMeetTab();

        await Clipboard.copy(meetTab.split("?")[0]);
        await showHUD("Copied meet link to clipboard");
      } catch {
        await showFailureToast("Failed to create meet link. Make sure your browser is supported and try again.");
        return;
      }

      // Refocus is best-effort and runs after the link is already on the
      // clipboard, so a keystroke failure here must not be reported as a
      // clipboard failure.
      if (refocus) {
        try {
          await switchToPreviousApp();
        } catch {
          // Swallow — the user already has the link.
        }
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
