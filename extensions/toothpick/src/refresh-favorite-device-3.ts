import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import refreshFavoriteDevice from "./refresh-device";

export default async function Command() {
  const { favoriteDevice3 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice3 });
  await refreshFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
}
