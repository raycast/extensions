import { getPreferenceValues } from "@raycast/api";
interface Preferences {
  pref_smb_ip: string;
  pref_smb_usr: string;
  pref_smb_pwd: string;
}
export function get_pref_smb_ip(): string {
  const prefernce = getPreferenceValues<Preferences>();
  return prefernce.pref_smb_ip;
}
export function get_pref_smb_usr(): string {
  const prefernce = getPreferenceValues<Preferences>();
  return prefernce.pref_smb_usr;
}
export function get_pref_smb_pwd(): string {
  const prefernce = getPreferenceValues<Preferences>();
  return prefernce.pref_smb_pwd;
}
