import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import refreshFavoriteDevice from "./refresh-device";

export default async function Command() {
  const { favoriteDevice2 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice2 });
  await refreshFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
}
