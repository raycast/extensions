import { getPreferenceValues } from "@raycast/api";
import { PsView } from "./lib/ui/PsView/main";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  return <PsView />;
}
