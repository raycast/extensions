import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import disconnectFavoriteDevice from "./disconnect-device";

export default async () => {
  const { favoriteDevice2 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice2 });
  await disconnectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
};
