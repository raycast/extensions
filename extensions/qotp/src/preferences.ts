import { getPreferenceValues } from "@raycast/api";

interface IPreferences {
  pin: string;
  secret: string;
  passphrase?: string;
  genCodeCount: number;
}

function Preferences(): IPreferences {
  const preferences = getPreferenceValues<IPreferences>();
  // console.log(preferences);
  // console.trace();
  return preferences;
}

const pres = Preferences();

export const pin = pres.pin;
export const secret = pres.secret;
export const passphrase = pres.passphrase;
export const genCodeCount = pres.genCodeCount;

export default pres;
