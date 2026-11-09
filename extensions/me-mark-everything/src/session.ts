import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { discover, handshake, type Session } from "./helper";

export const preferences = () => getPreferenceValues<{ discoveryPath?: string }>();

let connecting: Promise<Session> | undefined;
function connect() {
  const p = preferences();
  return discover(p.discoveryPath)
    .then(handshake)
    .then(async (active) => {
      if (active.notice)
        await showToast({ style: Toast.Style.Success, title: "Using installed ME", message: active.notice });
      return active;
    });
}
/** One handshake per command run; failures clear the cache so the next action retries. */
export function session(): Promise<Session> {
  if (!connecting)
    connecting = connect().catch((error) => {
      connecting = undefined;
      throw error;
    });
  return connecting;
}
