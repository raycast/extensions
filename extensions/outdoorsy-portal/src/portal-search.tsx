import { getPreferenceValues } from "@raycast/api";
import PortalSearch from "./portal-search/PortalSearch";
import { IPreferences } from "./types";

export default function Command() {
  const { adminToken } = getPreferenceValues<IPreferences>();
  
  return <PortalSearch adminToken={adminToken} />
}
