import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice3 } = getPreferenceValues();
  await updateCommandMetadata({ subtitle: favoriteDevice3 });
  await connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
};
