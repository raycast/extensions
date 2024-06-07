import { List } from "@raycast/api";
import { useProfiles } from "./hooks/useProfiles";
import { useCallback, useEffect, useMemo } from "react";
import { Profile } from "./types";
import { useConnectProfileSync } from "./hooks/useConnectProfileSync";
import { ProfileListItem } from "./components/ProfileListItem";
import { useDisconnectProfileSync } from "./hooks/useDisconnectProfileSync";
import { isProfileActive } from "./utils";

export default function Command() {
  const { isLoading, profiles, revalidate: revalidateProfiles } = useProfiles();
  const connectedProfile = useMemo(() => profiles.find(p => isProfileActive(p)) || null, [profiles]);
  const connectProfile = useConnectProfileSync();
  const disconnectProfile = useDisconnectProfileSync();
  const handleConnect = useCallback((profile: Profile) => {
    connectProfile(profile);
  }, [connectProfile]);
  const handleDisconnect = useCallback((profile: Profile) => {
    disconnectProfile(profile);
  }, [disconnectProfile]);

  useEffect(() => {
    const intervalID = setInterval(() => {
      revalidateProfiles();
    }, 2000);
    return () => clearInterval(intervalID);
  }, [revalidateProfiles]);

  return (
    <List isLoading={isLoading}>
      {profiles.map((profile) => (
        <ProfileListItem
          key={profile.id}
          profile={profile}
          activeProfile={connectedProfile}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      ))}
    </List>
  );
}
