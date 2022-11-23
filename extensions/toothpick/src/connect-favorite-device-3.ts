import { getPreferenceValues } from "@raycast/api";
import connectDevice from "./connect-device";

export default async () => {
  const { favoriteDevice3 } = getPreferenceValues();
  connectDevice({ arguments: { nameOrMacAddress: favoriteDevice3 } });
};
