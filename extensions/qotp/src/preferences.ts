import { getPreferenceValues } from "@raycast/api";

interface IPreferences {
  pin: string;
  secret: string;
  passphrase?: string;
  genCodeCount: number;
}

function Preferences(): IPreferences {
  const preferences = getPreferenceValues<IPreferences>();
  return preferences;
}

const pres = Preferences();

export const pin = pres.pin;
export const secret = pres.secret;
export const passphrase = pres.passphrase;
export const genCodeCount = pres.genCodeCount >= 1 ? pres.genCodeCount : 1;

export default pres;
