import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import disconnectFavoriteDevice from "./disconnect-device";

export default async () => {
  const { favoriteDevice3 } = getPreferenceValues();
  await updateCommandMetadata({ subtitle: favoriteDevice3 });
  await disconnectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
};
