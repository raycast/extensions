import { Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { resolveOwnSteamId } from "../lib/users";
import { SteamUserDetails } from "./SteamUserDetails";

export const MyProfile = () => {
  const { token, steamid } = getPreferenceValues<Preferences>();
  const { data: id, error } = usePromise(() => resolveOwnSteamId(steamid ?? "", token?.trim() ?? ""), []);
  if (error) return <Detail markdown={`# Could Not Load Steam Profile\n\n${error.message}`} />;
  if (!id) return <Detail isLoading markdown="" />;
  return <SteamUserDetails steamid={id} />;
};
