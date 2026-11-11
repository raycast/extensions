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

/**
 * Markdown images in a Raycast Detail are fetched by Raycast itself, so they cannot carry the
 * configured custom HTTP headers (for example Cloudflare Access credentials). Only embed the
 * stream when no custom headers are configured; otherwise the authenticated snapshot is used.
 */
export function getEmbeddableVideoStreamUrlFromCamera(state: State): string | undefined {
  if (ha.customHeaders && Object.keys(ha.customHeaders).length > 0) {
    return;
  }
  return getVideoStreamUrlFromCamera(state);
}
