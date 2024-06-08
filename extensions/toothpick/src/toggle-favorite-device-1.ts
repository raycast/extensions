import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import toggleFavoriteDevice from "./toggle-device";

export default async () => {
  const { favoriteDevice1 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice1 });
  await toggleFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice1 } });
};
