import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import refreshFavoriteDevice from "./refresh-device";

export default async function Command() {
  const { favoriteDevice1 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice1 });
  await refreshFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice1 } });
}
