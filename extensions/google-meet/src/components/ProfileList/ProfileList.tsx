import { ActionPanel, Action, showHUD, Clipboard, showToast, Toast, List } from "@raycast/api";
import { FC, useCallback } from "react";
import { getMeetTab, openMeetTabSelectedProfile, getTimeout } from "../../helpers";
import { useCacheHelpers } from "../../hooks";

export const ProfileList: FC = () => {
  const { profiles, onRemoveItem } = useCacheHelpers();

  const onSelect = useCallback(async (email: string) => {
    try {
      await openMeetTabSelectedProfile(email);
      const meetTab = await getMeetTab();

      const timeout = getTimeout();
      await new Promise((r) => setTimeout(r, timeout));

      await Clipboard.copy(meetTab.split("?")[0]);
      await showHUD("Copied meet link to clipboard");
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't copy to clipboard",
      });
    }
  }, []);

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
