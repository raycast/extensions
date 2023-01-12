import { getPreferenceValues } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice3 } = getPreferenceValues();
  connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
};
