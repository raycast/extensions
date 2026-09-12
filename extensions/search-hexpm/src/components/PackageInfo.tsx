import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { useHexPackageDetail } from "../hex/useHexPackageDetail";
import type { HexSearchResult, HexDetailResponse } from "../hex/types";

interface Props {
  item: HexSearchResult;
}

export const PackageInfo = ({ item }: Props): JSX.Element => {
  const [packageDetails, setPackageInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const buildMarkdown = (item: HexSearchResult, packageDetails: HexDetailResponse) => {
    const markdown = [];
    markdown.push(`# ${item.name}`);
    markdown.push(`> ${item.meta.description}`);
    markdown.push(`**License** ${item.meta.licenses?.join(", ") || "n/a"}`);
    markdown.push(`**Downloads** ${item.downloads.all}`);
    markdown.push(`**Latest Version** ${item.latest_version}`);
    markdown.push(`**Checksum** ${packageDetails.checksum}`);

    const dependencyCount = Object.keys(packageDetails.requirements).length;
    if (dependencyCount > 0) {
      markdown.push(`## Dependencies (${dependencyCount})`);
      markdown.push(buildDependencies(packageDetails));
    }

    markdown.push(`## Releases`);
    markdown.push(buildReleases(item));

    return markdown.join("\n\n");
  };

  const packageUrl = (packageName: string, version: string) => {
    return `https://hex.pm/packages/${packageName}/${version}`;
  };

  const buildDependencies = (packageDetails: HexDetailResponse) => {
    return Object.entries(packageDetails.requirements)
      .map(([_name, dependency]) => {
        let dependencyString = `- ${dependency.app} ${dependency.requirement}`;
        if (dependency.optional) {
          dependencyString += ` _(optional)_`;
        }
        return dependencyString;
      })
      .join("\n\n");
  };

  const buildReleases = (item: HexSearchResult) => {
    return item.releases
      .map((release) => {
        return `- **${release.version}** - <${packageUrl(item.name, release.version)}>`;
      })
      .join("\n\n");
  };

  const loadPackageDetails = async () => {
    setLoading(true);

    const packageDetails = await useHexPackageDetail(item);

    if (Object.keys(packageDetails).length > 0) {
      setPackageInfo(buildMarkdown(item, packageDetails));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPackageDetails();
  }, []);

  return (
    <Detail
      isLoading={loading}
      key={`${item}`}
      navigationTitle={`Search Hex > ${item.name} > details`}
      markdown={`${packageDetails}`}
    />
  );
};
