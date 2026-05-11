import { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Fragment } from "react";
import { API_BASE_URL, CATEGORIES, DEAULT_LIMIT, ICONS } from "./constants";
import { NobelPrizesResult } from "./types";
import generateNobelPrizeLink from "./utils/generateNobelPrizeLink";

export default function Laureates(props: LaunchProps<{ arguments: Arguments.NobelPrizes }>) {
  const { year: nobelPrizeYear, category: nobelPrizeCategory } = props.arguments;

  const { isLoading, data, error, pagination } = useFetch(
    (options) =>
      API_BASE_URL +
      "nobelPrizes?" +
      new URLSearchParams({
        offset: String(options.page * DEAULT_LIMIT),
        limit: DEAULT_LIMIT.toString(),
        nobelPrizeYear,
        nobelPrizeCategory,
      }).toString(),
    {
      mapResult(result: NobelPrizesResult) {
        return {
          data: result.nobelPrizes,
          hasMore: Boolean(result.links?.next),
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  const sectionTitle = `${nobelPrizeYear || "All Years"} / ${nobelPrizeCategory ? CATEGORIES[nobelPrizeCategory] : "All Categories"}`;

  return error ? (
    <Detail navigationTitle="Error" markdown={JSON.stringify(error)} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder="Filter Nobel Prizes (locally)"
    >
      <List.Section title={sectionTitle}>
        {data.map((prize, prizeIndex) => (
          <List.Item
            key={prizeIndex}
            title={`${prize.awardYear} - ${prize.category.en}`}
            icon={ICONS[prize.category.en as keyof typeof ICONS]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Award Year" text={prize.awardYear.toString()} />
                    <List.Item.Detail.Metadata.Label title="Category (en)" text={prize.category.en} />
                    <List.Item.Detail.Metadata.Label title="Date Awarded" text={prize.dateAwarded || "N/A"} />
                    <List.Item.Detail.Metadata.Label
                      title="Top Motivation (en)"
                      text={prize.topMotivation?.en || "N/A"}
                    />
                    <List.Item.Detail.Metadata.Label title="Prize Amount" text={prize.prizeAmount.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Prize Amount Adjusted"
                      text={prize.prizeAmountAdjusted.toString()}
                    />

                    <List.Item.Detail.Metadata.Separator />
                    {prize.laureates?.map((laureate) => (
                      <Fragment key={laureate.id}>
                        {"orgName" in laureate ? (
                          <List.Item.Detail.Metadata.Label title="Organization Name (en)" text={laureate.orgName.en} />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Full Name (en)" text={laureate.fullName.en} />
                        )}
                        <List.Item.Detail.Metadata.Label title="Portion" text={laureate.portion} />
                        <List.Item.Detail.Metadata.Label title="Sort Order" text={laureate.sortOrder} />
                        <List.Item.Detail.Metadata.Label title="Motivation (en)" text={laureate.motivation.en} />
                      </Fragment>
                    )) || <List.Item.Detail.Metadata.Label title="Laureates" icon={Icon.Minus} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="View in nobelprize.org"
                  icon={getFavicon(generateNobelPrizeLink(prize))}
                  url={generateNobelPrizeLink(prize)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
