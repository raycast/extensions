import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice1 } = getPreferenceValues<ExtensionPreferences>();
  await updateCommandMetadata({ subtitle: favoriteDevice1 });
  await connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice1 } });
};
