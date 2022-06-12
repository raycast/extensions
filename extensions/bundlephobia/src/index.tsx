import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { fetchSizeBundlephobia, fetchSuggestionsBunldephobia } from "./fetchUtils";
import { NpmsFetchResponse, Links } from "./packagesResponse";
import { PackageResultModel } from "./packageRepsonse";
import { formatInformationOfPackage } from "./utils";

export default function Command() {
  const [results, setResults] = useState<NpmsFetchResponse>([]);
  const [detailResult, setDetailResult] = useState<PackageResultModel>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [links, setLinks] = useState<Links | null>(null);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const response = await fetchSuggestionsBunldephobia(text);
    setSearchTerm(text);
    setResults(response);
    setLoading(false);
  };
  const onSelectionChange = async (id = "") => {
    const [packageName, version] = id?.split("|") || [];

    if (packageName) {
      setLoadingDetail(true);
      const selectedPackage = results.find(
        ({ package: packageNpm }) => packageNpm.name === packageName && packageNpm.version === version
      );
      if (selectedPackage) {
        setLinks(selectedPackage?.package?.links as Links);
      }
      const response = await fetchSizeBundlephobia(packageName);
      setDetailResult(response);
      setLoadingDetail(false);
    }
  };

  const { minifiedSizeInKB, minifiedGzipSizeInKB, timeWithSlowSpeed, timeWithFastSpeed } =
    formatInformationOfPackage(detailResult);
  const markdown: string[] = [];
  if (detailResult && links) {
    markdown.push(`## ${detailResult.name} ${detailResult.version}`);
    markdown.push(`${detailResult.description}`);
    markdown.push(`[Homepage](${links?.homepage})`);
    markdown.push(`[Npm](${links?.npm})`);
    markdown.push(`[Github](${links?.repository})`);
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search packages, like "react"…`}
      onSearchTextChange={onSearchTextChange}
      throttle
      onSelectionChange={onSelectionChange}
      isShowingDetail={!!detailResult}
    >
      {!results?.length ? (
        <List.EmptyView title="Type something to search" />
      ) : (
        results.map(({ package: { name, version } }) => {
          return (
            <List.Item
              key={name}
              title={name || ""}
              subtitle={version || ""}
              id={`${name}|${version}`}
              detail={
                <List.Item.Detail
                  isLoading={loadingDetail}
                  markdown={markdown.join("\n")}
                  metadata={
                    detailResult && links ? (
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Bundle size" />
                        <List.Item.Detail.Metadata.Label title="Minified" text={`${minifiedSizeInKB.toFixed(1)}kB`} />
                        <List.Item.Detail.Metadata.Label
                          title="Minified + Gzipped"
                          text={`${minifiedGzipSizeInKB.toFixed(1)}kB`}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Download Time" />
                        <List.Item.Detail.Metadata.Label title="Slow 3G" text={`${timeWithSlowSpeed}ms`} />
                        <List.Item.Detail.Metadata.Label title="Emerging 4G" text={`${timeWithFastSpeed}ms`} />
                      </List.Item.Detail.Metadata>
                    ) : null
                  }
                />
              }
            />
          );
        })
      )}
    </List>
  );
}
