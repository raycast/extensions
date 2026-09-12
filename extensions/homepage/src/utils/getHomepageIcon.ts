import { Image, environment } from "@raycast/api";

export default function getHomepageIcon(imageIdentifier: string): Image {
  // Valid URL pattern
  const urlPattern = /^(https?:\/\/)/i;

  // Provider configurations with patterns and formatting functions
  const imgProviders: {
    [key: string]: { baseUrl: string; pattern: RegExp; format: (match: RegExpMatchArray) => string };
  } = {
    simpleIcons: {
      baseUrl: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/",
      pattern: /^si-(.*)$/,
      format: (match: RegExpMatchArray) => `${match[1]}.svg`,
    },
    mdi: {
      baseUrl: "https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/",
      pattern: /^mdi-(.*?)-(#[0-9A-Fa-f]{6})$/,
      format: (match: RegExpMatchArray) => `${match[1]}.svg`,
    },
    dashboard: {
      baseUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/",
      pattern: /^[a-zA-Z0-9_-]+(\.png)?$/,
      format: (match: RegExpMatchArray) => (match[1] ? match[0] : `${match[0]}.png`),
    },
  };

  // Throw an error for invalid or empty identifier
  if (!imageIdentifier) {
    throw new Error("Invalid image identifier");
  }

  let imgUrl = "";

  // Check if the string is a full URL and if so, return it directly
  if (urlPattern.test(imageIdentifier)) {
    imgUrl = imageIdentifier;
  } else {
    // Check if the identifier matches any provider pattern
    for (const key in imgProviders) {
      if (Object.prototype.hasOwnProperty.call(imgProviders, key)) {
        const { baseUrl, pattern, format } = imgProviders[key];
        const match = imageIdentifier.match(pattern);

        if (match) {
          imgUrl = `${baseUrl}${format(match)}`;
          break;
        }
      }
    }

    // If no provider pattern matched, assume 'dashboard' provider for single words
    if (!imgUrl) {
      imgUrl = `${imgProviders.dashboard.baseUrl}${imageIdentifier}.png`;
    }
  }

  // Determine if the image is SVG and the environment appearance
  const isSvg = imgUrl.endsWith(".svg");
  const isDarkMode = environment.appearance === "dark";

  // Determine the tintColor based on the provider pattern
  const needsTintColor = /^si-|^mdi-/.test(imageIdentifier);
  const tintColor = needsTintColor ? (isDarkMode ? "#ffffff" : "#000000") : undefined;

  // Return the Image object
  return {
    source: imgUrl,
    tintColor: isSvg ? tintColor : undefined,
  };
}
