import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./lib/types";
import { ChatView } from "./lib/ui/ChatView/main";

const p = getPreferenceValues<Preferences>();
if (!p.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  return <ChatView />;
}
