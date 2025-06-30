import { checkIsValidURL } from "@urls";

export const avatarURL = (url: string | null): string => {
  const defaultSize = 100;
  const defaultURL = "https://github.com/raycast.png";

  if (url && url.length > 0 && checkIsValidURL(url)) {
    const path = new URL(url);

    if (path.host === "twitter.com") {
      return `https://unavatar.io/twitter${path.pathname}`;
    } else if (path.host === "github.com") {
      return `${url}.png?size=${defaultSize}`;
    } else {
      return `https://unavatar.io/${path.host}?fallback=${defaultURL}`;
    }
  }

  return `${defaultURL}?size=${defaultSize}`;
};
