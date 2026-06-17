import { formatDistance } from "date-fns";

/**
 * Return the author name from the author url. E.g., 'Team Yoast' from <a href=\"https://yoa.st/1uk\">Team Yoast</a>
 *
 * @param authorUrl string
 *
 * @return string
 */
export function parseAuthorNameFromUrl(authorUrl: string) {
  const regex = /<a[^>]*>([^<]*)<\/a>/;
  const result = authorUrl.match(regex);

  if (result === null) {
    return authorUrl;
  }

  return result[1];
}

/**
 * Get formatted "Last Updated" string e.g., 3 days ago, 5 months ago.
 *
 * @param lastUpdatedDate string
 * @returns string
 */
export function getFormattedLastUpdated(lastUpdatedDate: string) {
  const getLastUpdatedDate = lastUpdatedDate.trim().split(/\s+/)[0];
  return formatDistance(new Date(getLastUpdatedDate), new Date());
}

/**
 * Get Formatted "Active Installations" string e.g, 5 million, 80,000+,
 *
 * @param preformattedValue number
 * @returns string
 */
export function getFormattedActiveInstallations(preformattedValue: number) {
  let formattedValue;

  if (preformattedValue < 1000000) {
    formattedValue = new Intl.NumberFormat().format(preformattedValue) + "+";
  } else {
    formattedValue = preformattedValue.toString()[0] + "+ million";
  }

  return formattedValue;
}

/**
 * Get plugin icons.
 *
 * @param icons An object of icons
 * @returns string The icon URL.
 */
export function getPluginIcon(icons: Record<"2x" | "1x" | "svg" | "default", string>) {
  return icons?.["2x"] || icons?.["1x"] || icons?.["svg"] || icons?.["default"];
}
