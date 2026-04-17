import { environment } from "@raycast/api";

export const createDeepLink = function <T>(command: string, context?: T) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const deeplink = `${protocol}extensions/benvp/audio-device/${command}`;

  if (context) {
    const payload = encodeURIComponent(JSON.stringify(context));
    return `${deeplink}?context=${payload}`;
  }

  return deeplink;
};
