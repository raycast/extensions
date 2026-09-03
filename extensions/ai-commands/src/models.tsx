import { getPreferenceValues } from "@raycast/api";
import { ModelView } from "./lib/ui/ModelView/main";

const p = getPreferenceValues<Preferences>();
if (p.ollamaCertificateValidation === false) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): React.JSX.Element {
  return ModelView();
}
