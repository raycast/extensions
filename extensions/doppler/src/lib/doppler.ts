import DopplerSDK from "@dopplerhq/node-sdk";
import { getPreferenceValues } from "@raycast/api";

const accessToken = getPreferenceValues<Preferences>().access_token;
export const doppler = new DopplerSDK({ accessToken });
