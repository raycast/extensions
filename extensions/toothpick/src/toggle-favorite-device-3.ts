import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import toggleFavoriteDevice from "./toggle-device";

export default async () => {
  const { favoriteDevice3 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice3 });
  await toggleFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
};
