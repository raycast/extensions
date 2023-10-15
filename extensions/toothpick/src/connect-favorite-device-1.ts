import { getPreferenceValues } from "@raycast/api";
import connectFavoriteDevice from "./connect-device";

export default async () => {
  const { favoriteDevice1 } = getPreferenceValues();
  connectFavoriteDevice({ arguments: { nameOrMacAddress: favoriteDevice1 } });
};
