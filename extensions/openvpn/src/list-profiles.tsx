import React from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { connect, disconnect, getStatus, isRunning, listProfiles } from "./utils";

function ListProfiles() {
  const { data: isClientRunning } = usePromise(isRunning, []);
  const { data: profiles, isLoading: isLoadingProfiles } = useCachedPromise(listProfiles, [], {
    keepPreviousData: true,
  });

  const {
    data: status,
    isLoading: isLoadingStatus,
    revalidate,
  } = useCachedPromise(getStatus, [], {
    initialData: {
      isConnected: false,
      selectedProfileName: "",
    },
    execute: !!isClientRunning,
  });

  const selectedProfile = React.useMemo(
    () => (status.selectedProfileName ? profiles?.find(({ name }) => name === status.selectedProfileName) : undefined),
    [profiles, status.selectedProfileName],
  );

  const orderedProfiles = React.useMemo(
    () => profiles?.sort((profileA, profileB) => (profileA.name < profileB.name ? 1 : -1)),
    [profiles],
  );

  const toggleProfile = React.useCallback(
    async (profileName: string) => {
      let error;

      if (status.isConnected && profileName === selectedProfile?.name) {
        error = await disconnect();
      } else {
        error = await connect(profileName);
      }

      revalidate();

      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: error,
        });
      }
    },
    [status.isConnected, selectedProfile, revalidate],
  );

  return (
    <List isLoading={isLoadingProfiles || isLoadingStatus}>
      {orderedProfiles?.map((profile) => {
        const isProfileConnected = status.isConnected && profile.id === selectedProfile?.id;
        return (
          <List.Item
            key={profile.id}
            title={profile.name}
            icon={
              isProfileConnected
                ? { source: Icon.CircleProgress100, tintColor: Color.Blue }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            subtitle={profile.host}
            actions={
              <ActionPanel>
                <Action
                  title={isProfileConnected ? "Disconnect" : "Connect"}
                  onAction={() => toggleProfile(profile.name)}
                  icon={isProfileConnected ? Icon.BoltDisabled : Icon.Bolt}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default ListProfiles;
