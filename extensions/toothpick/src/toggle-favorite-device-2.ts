import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import toggleFavoriteDevice from "./toggle-device";

export default async () => {
  const { favoriteDevice2 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice2 });
  await toggleFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
};
