import { Feature } from "../types/feature";
import { featureSupportedIn } from "./featureSupportedIn";
import { getVersions } from "./versions";

export function generateMarkdownTableRow(feature: Feature) {
  const versions = getVersions();

  const tableHeader = `| ${versions.join(" | ")} |\n| ${versions.map(() => "---").join(" | ")} |\n`;

  const supportRow = versions.map((version) => (featureSupportedIn(feature, version) ? "✅" : "🚫")).join(" | ");
  const featureRow = `| ${supportRow} |\n`;

  return tableHeader + featureRow;
}
