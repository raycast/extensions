import { open, showHUD, getPreferenceValues, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  siteMappings: string;
}

async function getSiteMap(): Promise<Record<string, string>> {
  try {
    const { siteMappings: preferenceSites } = getPreferenceValues<Preferences>();
    const preferenceMap = JSON.parse(preferenceSites || "{}");

    const localSiteMappings = await LocalStorage.getItem<string>("siteMappings");
    const localMap = JSON.parse(localSiteMappings || "{}");

    return { ...preferenceMap, ...localMap };
  } catch (error) {
    showFailureToast("Invalid site mappings format");
    return {};
  }
}

function getInitials(str: string): string {
  const words = str.split(/[\s_-]/);

  if (words.length === 1) {
    return str.slice(0, 2).toLowerCase();
  }

  return words.map((word) => word[0]?.toLowerCase()).join("");
}

async function findBestMatch(input: string): Promise<string | null> {
  const searchTerm = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;
  const siteMap = await getSiteMap();

  for (const site of Object.keys(siteMap)) {
    const siteLower = site.toLowerCase();
    const initials = getInitials(site);

    if (siteLower === searchTerm || initials === searchTerm) {
      return site;
    }

    if (siteLower.startsWith(searchTerm)) {
      const score = 1 + searchTerm.length / site.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = site;
      }
    }

    if (siteLower.includes(searchTerm)) {
      const score = searchTerm.length / site.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = site;
      }
    }
  }

  return bestMatch;
}

export default async function Command(props: { arguments: { site?: string } }) {
  const { site } = props.arguments;

  if (!site) {
    showHUD("Please provide a site name");
    return null;
  }

  const matchedSite = await findBestMatch(site);
  if (matchedSite) {
    const siteMap = await getSiteMap();
    try {
      await open(siteMap[matchedSite]);
      showHUD(`Opening ${matchedSite}`);
    } catch (error) {
      showHUD("Failed to open site");
    }
    return null;
  }

  showHUD("No matching site found");
  return null;
}
