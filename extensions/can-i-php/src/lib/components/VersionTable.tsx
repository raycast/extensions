import { getVersions } from "../util/versions";
import { Feature } from "../types/feature";
import { featureSupportedIn } from "../util/featureSupportedIn";

const versions = getVersions();

const VersionTable = (feature: Feature) => {
  const tableHeader = `| Feature Name | ${versions.join(" | ")} |\n| --- | ${versions
    .map(() => "---")
    .join(" | ")} |\n`;

  const supportRow = versions.map((version) => (featureSupportedIn(feature, version) ? "✅" : "❌")).join(" | ");
  const featureRow = `| ${feature.name} | ${supportRow} |\n`;

  return <pre>{tableHeader + featureRow}</pre>;
};

export default VersionTable;
