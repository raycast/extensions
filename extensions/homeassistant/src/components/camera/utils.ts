import { ha } from "@lib/common";
import { State } from "@lib/haapi";

export function getVideoStreamUrlFromCamera(state: State): string | undefined {
  const access_token = state.attributes.access_token as string | undefined;
  if (!access_token) {
    return;
  }
  const url = ha.urlJoin(`api/camera_proxy_stream/${state.entity_id}?token=${access_token}`);
  return url;
}
