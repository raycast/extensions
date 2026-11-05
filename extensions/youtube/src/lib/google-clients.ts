import { youtube, youtube_v3 } from "@googleapis/youtube";

export function createYoutubeClient(apikey: string): youtube_v3.Youtube {
  return youtube({
    version: "v3",
    auth: apikey,
    // Gaxios's dynamic node-fetch import is not callable in Raycast's shared dependency bundles.
    fetchImplementation: globalThis.fetch,
  } as youtube_v3.Options);
}
