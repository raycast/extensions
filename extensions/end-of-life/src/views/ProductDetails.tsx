import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ProductResponse, ProductRelease } from "../types";

export default function ProductDetails({ product }: { product: string }) {
  const { data, isLoading } = useFetch<ProductResponse>(`https://endoflife.date/api/v1/products/${product}`);

  const getSupportStatus = (release: ProductRelease) => {
    if (release.isDiscontinued) {
      return { text: "Discontinued", color: "#f77d7e" };
    }

    if (release.isMaintained === false) {
      return { text: "EOL", color: "#f77d7e" };
    }

    if (release.isEoas === false) {
      return release.isLts ? { text: "LTS", color: "#74c0fc" } : { text: "Active support", color: "#40d693" };
    }

    if (release.isEoes === false && release.isEol === true) {
      return { text: "Extended support", color: "#ffa94d" };
    }

    if (release.isEoas === true && release.isEoes === false) {
      return { text: "Extended support", color: "#ffa94d" };
    }

    if (release.isEoas !== true && release.isEoes !== true && release.isEol !== true) {
      return { text: "Active support", color: "#40d693" };
    }

    return { text: "Maintained", color: "#40d693" };
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search releases..." isShowingDetail>
      <List.Section title={`${data?.result.label || product} Releases`}>
        {(data?.result.releases || []).map((release) => (
          <List.Item
            id={release.name}
            key={release.name}
            title={release.name}
            accessories={[
              {
                tag: (() => {
                  const status = getSupportStatus(release);
                  return { value: status.text, color: status.color };
                })(),
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Release" text={release.name} />
                    <List.Item.Detail.Metadata.Label title="Codename" text={release.codename || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Release Date" text={release.releaseDate} />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        {...(() => {
                          const status = getSupportStatus(release);
                          return { text: status.text, color: status.color };
                        })()}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Latest Version" text={release.latest?.name || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Latest Date" text={release.latest?.date || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Latest Link" text={release.latest?.link || "N/A"} />
                    <List.Item.Detail.Metadata.Separator />
                    {release.ltsFrom && (
                      <List.Item.Detail.Metadata.Label title="Long Term Support From" text={release.ltsFrom} />
                    )}
                    {release.eolFrom && (
                      <List.Item.Detail.Metadata.Label title="End of Life From" text={release.eolFrom} />
                    )}
                    {release.eoasFrom && (
                      <List.Item.Detail.Metadata.Label title="End of Active Support From" text={release.eoasFrom} />
                    )}
                    {release.eoesFrom && (
                      <List.Item.Detail.Metadata.Label title="End of Extended Support From" text={release.eoesFrom} />
                    )}
                    {release.discontinuedFrom && (
                      <List.Item.Detail.Metadata.Label title="Discontinued From" text={release.discontinuedFrom} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View on Endoflife.date"
                  url={data?.result.links.html || `https://endoflife.date/${product}`}
                  icon={Icon.Globe}
                />
                {release.latest?.link && (
                  <Action.OpenInBrowser title="View Latest Release" url={release.latest.link} icon={Icon.ArrowNe} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
