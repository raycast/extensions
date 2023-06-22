import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice2 } = getPreferenceValues();
  await updateCommandMetadata({ subtitle: favoriteDevice2 });
  await connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
};
