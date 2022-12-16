import { getPreferenceValues } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice2 } = getPreferenceValues();
  connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
};
