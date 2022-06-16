import { List } from "@raycast/api";
import { useState } from "react";
import { formatInformationOfPackage } from "./utils";
import { useGetDetail, useSearch } from "./hook";
import { Links } from "./packagesResponse";

export default function Command() {
  const [results, isLoading, search] = useSearch();
  const [detail, isDetailLoading, select] = useGetDetail();
  const [links, setLinks] = useState<Links | null>(null);

  const callback = (packageName: string, version: string) => {
    const selectedPackage = results?.find(
      ({ package: packageNpm }) => packageNpm.name === packageName && packageNpm.version === version
    );
    if (selectedPackage) {
      setLinks(selectedPackage?.package?.links as Links);
    }
  };

  const { minifiedSizeInKB, minifiedGzipSizeInKB, timeWithSlowSpeed, timeWithFastSpeed } =
    formatInformationOfPackage(detail);
  const markdown: string[] = [];
  if (detail && links) {
    markdown.push(`## ${detail.name} ${detail.version}`);
    markdown.push(`${detail.description}\n`);
    markdown.push(`[Homepage](${links?.homepage})`);
    markdown.push(`[Npm](${links?.npm})`);
    markdown.push(`[Github](${links?.repository})`);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "react"…`}
      onSearchTextChange={search}
      throttle
      onSelectionChange={(id) => select(id, callback)}
      isShowingDetail={!!detail}
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
                  isLoading={isDetailLoading}
                  markdown={markdown.join("\n")}
                  metadata={
                    detail && links ? (
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
