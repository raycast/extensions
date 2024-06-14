import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import disconnectFavoriteDevice from "./disconnect-device";

export default async () => {
  const { favoriteDevice1 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice1 });
  await disconnectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice1 } });
};
