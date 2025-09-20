import { Icon, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { ArtCrime, SuccessResponse } from "./lib/types";
import { API_HEADERS, BASE_API_URL, PAGE_SIZE } from "./lib/constants";
import { ItemWithTextOrIcon, generateMarkdown } from "./lib/utils";
import ImagesMetadata from "./lib/components/ImagesMetadata";
import { useState } from "react";

export default function ArtCrimes() {
  const [searchTitle, setSearchTitle] = useState("");
  const [total, setTotal] = useCachedState<number>("total-artcrimes");
  const {
    isLoading,
    data: artcrimes,
    pagination,
  } = useFetch(
    (options) =>
      BASE_API_URL +
      "@artcrimes?" +
      new URLSearchParams({
        page: String(options.page + 1),
        pageSize: PAGE_SIZE.toString(),
        title: searchTitle,
      }).toString(),
    {
      headers: API_HEADERS,
      mapResult(result: SuccessResponse<ArtCrime>) {
        if (!total) setTotal(result.total);
        const lastPage = Number((result.total / PAGE_SIZE).toFixed());
        return {
          data: result.items,
          hasMore: lastPage !== result.page,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail
      searchBarPlaceholder="Search title"
      onSearchTextChange={setSearchTitle}
      throttle
    >
      <List.Section title={`${artcrimes.length} of ${total} Art Crimes`}>
        {artcrimes.map((artcrime) => (
          <List.Item
            key={artcrime.uid}
            title={artcrime.title}
            icon={Icon.Brush}
            detail={
              <List.Item.Detail
                markdown={generateMarkdown(artcrime)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <ItemWithTextOrIcon title="Crime Category" text={artcrime.crimeCategory} />
                    {artcrime.additionalData ? (
                      <List.Item.Detail.Metadata.TagList title="Additional Data">
                        {artcrime.additionalData.split(";").map((item, itemIndex) => (
                          <List.Item.Detail.Metadata.TagList.Item key={item + itemIndex} text={item} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Additional Data" icon={Icon.Minus} />
                    )}
                    <ItemWithTextOrIcon title="Period" text={artcrime.period} />
                    <List.Item.Detail.Metadata.Label
                      title="Is Stealth"
                      icon={artcrime.isStealth ? Icon.Check : Icon.Multiply}
                    />
                    <ItemWithTextOrIcon title="ID In Agency" text={artcrime.idInAgency} />
                    <ItemWithTextOrIcon title="Maker" text={artcrime.maker} />
                    <List.Item.Detail.Metadata.Label title="Title" text={artcrime.title} />
                    <ItemWithTextOrIcon title="Materials" text={artcrime.materials} />
                    <List.Item.Detail.Metadata.Link title="URL" text={artcrime.url} target={artcrime.url} />
                    <ItemWithTextOrIcon title="Modified" text={artcrime.modified} />
                    <ItemWithTextOrIcon title="Reference Number" text={artcrime.referenceNumber} />
                    <ItemWithTextOrIcon title="Crime Category" text={artcrime.crimeCategory} />
                    <List.Item.Detail.Metadata.Label title="Descriptions" text={artcrime.description} />
                    <ImagesMetadata images={artcrime.images} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
