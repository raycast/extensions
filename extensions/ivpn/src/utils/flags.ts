import { Icon, Image, getPreferenceValues } from "@raycast/api";

export function getFlagIcon(countryCode: string): Image.ImageLike {
  return FLAG_SOURCES[getPrefs().flagIconSource](countryCode);
}

const FLAG_SOURCES = {
  ["flagsapi.com"](countryCode) {
    return {
      source: `https://flagsapi.com/${countryCode}/flat/64.png`,
      fallback: Icon.Globe,
    };
  },
  ["flagcdn.com"](countryCode) {
    return {
      source: `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`,
      fallback: Icon.Globe,
    };
  },
} satisfies Record<ExtensionPreferences["flagIconSource"], typeof getFlagIcon>;

const getPrefs = () => getPreferenceValues<Preferences>();
