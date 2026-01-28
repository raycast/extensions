import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Fragment, useState } from "react";
import { API_BASE_URL, DEAULT_LIMIT } from "./constants";
import { LaureatesResult } from "./types";
import generateNobelPrizeLink from "./utils/generateNobelPrizeLink";

export default function Laureates() {
  const [search, setSearch] = useState("name");
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error, pagination } = useFetch(
    (options) =>
      API_BASE_URL +
      "laureates?" +
      new URLSearchParams({ offset: String(options.page * DEAULT_LIMIT), limit: DEAULT_LIMIT.toString() }).toString() +
      `&${search}=${searchText}`,
    {
      mapResult(result: LaureatesResult) {
        return {
          data: result.laureates,
          hasMore: Boolean(result.links?.next),
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return error ? (
    <Detail navigationTitle="Error" markdown={JSON.stringify(error)} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder={`Search by ${search}`}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Search" onChange={setSearch}>
          <List.Dropdown.Item title="Name" value="name" icon={Icon.Text} />
          <List.Dropdown.Item title="Motivation" value="motivation" icon={Icon.Paragraph} />
        </List.Dropdown>
      }
    >
      {data.map((laureate) => {
        const isOrg = "orgName" in laureate;
        const title = isOrg ? laureate.orgName.en : laureate.fullName.en;

        return (
          <List.Item
            key={laureate.id}
            title={title}
            icon={
              isOrg
                ? Icon.Building
                : { source: `https://www.nobelprize.org/laureates/${laureate.fileName}/`, fallback: Icon.Person }
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={laureate.id.toString()} />
                    <List.Item.Detail.Metadata.Link
                      title="Wikipedia"
                      text={laureate.wikipedia.slug}
                      target={laureate.wikipedia.english}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Wikidata"
                      text={laureate.wikidata.id}
                      target={laureate.wikidata.url}
                    />
                    {!isOrg ? (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Family Name (en)"
                          text={laureate.familyName?.en || "N/A"}
                        />
                        <List.Item.Detail.Metadata.Label title="Full Name (en)" text={laureate.fullName.en} />
                        <List.Item.Detail.Metadata.Label title="Filename" text={laureate.fileName} />
                        <List.Item.Detail.Metadata.Label title="Pen Name" text={laureate.penname || "N/A"} />
                        <List.Item.Detail.Metadata.Label
                          title="Gender"
                          icon={laureate.gender === "male" ? Icon.Male : Icon.Female}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Birth"
                          text={`${laureate.birth.date} - ${laureate.birth.place?.locationString.en || "N/A"}`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Death"
                          text={`${laureate.death?.date || "N/A"} - ${laureate.birth.place?.locationString.en || "N/A"}`}
                        />
                      </>
                    ) : (
                      <>
                        <List.Item.Detail.Metadata.Label title="Organization Name (en)" text={laureate.orgName.en} />
                        <List.Item.Detail.Metadata.Label title="Native Name" text={laureate.nativeName || "N/A"} />
                        <List.Item.Detail.Metadata.Label title="File Name" text={laureate.fileName || "N/A"} />
                        <List.Item.Detail.Metadata.Label title="Acronym" text={laureate.acronym || "N/A"} />
                        <List.Item.Detail.Metadata.Label
                          title="Founded"
                          text={`${laureate.founded.date} - ${laureate.founded.place?.locationString.en || "N/A"}`}
                        />
                        <List.Item.Detail.Metadata.Label title="Dissolution" text={laureate.dissolution || "N/A"} />
                        <List.Item.Detail.Metadata.Label
                          title="Headquarters"
                          text={laureate.headquarters?.locationString.en || "N/A"}
                        />
                      </>
                    )}

                    {laureate.nobelPrizes.map((prize, prizeIndex) => (
                      <Fragment key={`${laureate.id}.${prizeIndex}`}>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title={`The Nobel Prize in ${prize.category.en} ${prize.awardYear}`}
                          text={prize.awardYear}
                        />

                        <List.Item.Detail.Metadata.Label title="Award Year" text={prize.awardYear} />
                        <List.Item.Detail.Metadata.Label title="Category (en)" text={prize.category.en} />
                        <List.Item.Detail.Metadata.Label title="Portion" text={prize.portion} />
                        <List.Item.Detail.Metadata.Label title="Sort Order" text={prize.sortOrder} />
                        <List.Item.Detail.Metadata.Label title="Date Awarded" text={prize.dateAwarded} />
                        <List.Item.Detail.Metadata.Label title="Prize Status" text={prize.prizeStatus} />
                        <List.Item.Detail.Metadata.Label title="Motivation (en)" text={prize.motivation.en} />
                        <List.Item.Detail.Metadata.Label title="Prize Amount" text={prize.prizeAmount.toString()} />
                        <List.Item.Detail.Metadata.Label
                          title="Prize Amount Adjusted"
                          text={prize.prizeAmountAdjusted.toString()}
                        />
                        {prize.affiliations ? (
                          <List.Item.Detail.Metadata.TagList title="Affiliations">
                            {prize.affiliations.map((affiliation) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={affiliation.nameNow.en}
                                text={affiliation.nameNow.en}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Affiliations" icon={Icon.Minus} />
                        )}
                        {prize.residences ? (
                          <List.Item.Detail.Metadata.TagList title="Residences">
                            {prize.residences.map((residence) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={residence.locationString.en}
                                text={residence.locationString.en}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Residences" icon={Icon.Minus} />
                        )}
                      </Fragment>
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Wikipedia" icon="wikipedia.png" url={laureate.wikipedia.english} />
                <Action.OpenInBrowser title="Open in Wikidata" icon="wikidata.png" url={laureate.wikidata.url} />
                <Action.OpenInBrowser
                  title="View in nobelprize.org"
                  icon={getFavicon(generateNobelPrizeLink(laureate.nobelPrizes[0], laureate.fileName))}
                  url={generateNobelPrizeLink(laureate.nobelPrizes[0], laureate.fileName)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
