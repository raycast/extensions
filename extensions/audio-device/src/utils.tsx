export const createDeepLink = function <T>(command: string, context?: T) {
  const deeplink = `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/benvp/audio-device/${command}`;

  if (context) {
    const payload = encodeURIComponent(JSON.stringify(context));
    return `${deeplink}?context=${payload}`;
  }

  return deeplink;
};
