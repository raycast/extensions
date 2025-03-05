import { open, showHUD, getPreferenceValues } from "@raycast/api";

interface Preferences {
  siteMappings: string;
}

function getSiteMap(): Record<string, string> {
  const { siteMappings } = getPreferenceValues<Preferences>();
  try {
    return JSON.parse(siteMappings);
  } catch (error) {
    showHUD("Invalid site mappings format");
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

function findBestMatch(input: string): string | null {
  const searchTerm = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;
  const siteMap = getSiteMap();

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
      continue;
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

export default function Command(props: { arguments: { site?: string } }) {
  const { site } = props.arguments;

  if (!site) {
    showHUD("Please provide a site name");
    return null;
  }

  const matchedSite = findBestMatch(site);
  if (matchedSite) {
    const siteMap = getSiteMap();
    open(siteMap[matchedSite]);
    showHUD(`Opening ${matchedSite}`);
    return null;
  }

  showHUD("No matching site found");
  return null;
}
