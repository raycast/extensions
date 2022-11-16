import { getPreferenceValues } from "@raycast/api";
import connectDevice from "./connect-device";

export default async () => {
  const { favoriteDevice2 } = getPreferenceValues();
  connectDevice({ arguments: { nameOrMacAddress: favoriteDevice2 } });
};
