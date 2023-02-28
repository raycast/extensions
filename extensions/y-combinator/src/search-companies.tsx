import { ActionPanel, Action, List, Image, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { useEffect, useState } from "react";
import { createGlobalState } from "react-hooks-global-state";

type SearchResult = {
  companies: Company[];
  prevPage?: string;
  nextPage?: string;
  page: number;
  totalPages: number;
};

type Company = {
  id: number;
  name: string;
  slug: string;
  website: string;
  smallLogoUrl?: string;
  oneLiner: string;
  longDescription: string;
  teamSize: number;
  url: string;
  batch: string;
  tags: string[];
  status: string;
  industries: string[];
  regions: string[];
  locations: string[];
  badges: string[];
};

function getBatches() {
  const batches = new Array<{ title: string; value: string; icon: Image.ImageLike }>();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  for (let batchYear = currentYear; batchYear >= 2005; batchYear--) {
    const batchNumber = String(batchYear).slice(-2);

    const batchIcon = Object.entries(Icon).find(([name]) => name === `Number${batchNumber}`)?.[1] ?? Icon.Number00;

    if (batchYear !== currentYear || (batchYear === currentYear && currentMonth >= 6)) {
      const summerBatch = {
        title: `Summer ${batchYear}`,
        value: `s${batchNumber}`,
        icon: batchIcon,
      };
      batches.push(summerBatch);
    }

    if (batchYear !== 2005) {
      const winterBatch = {
        title: `Winter ${batchYear}`,
        value: `w${batchNumber}`,
        icon: batchIcon,
      };
      batches.push(winterBatch);
    }
  }

  return batches;
}

function getDomain(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (e) {
    return url;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Public":
      return Color.Green;
    case "Active":
      return Color.Green;
    case "Acquired":
      return Color.Yellow;
    case "Not YC":
      return Color.Blue;
    case "Inactive":
      return Color.Red;
    default:
      console.warn("Unknown status", status);
      return undefined;
  }
}

function getStatusAccessory(company: Company) {
  const accessory: List.Item.Accessory = {
    icon: {
      source: Icon.CircleFilled,
      tintColor: getStatusColor(company.status),
    },
    tooltip: `Status: ${company.status}`,
  };
  return accessory;
}

function getBatchAccessory(company: Company) {
  const accessory: List.Item.Accessory = {
    text: company.batch,
    tooltip: `Batch: ${company.batch}`,
  };
  return accessory;
}

function getSearchParams(searchText: string, batch: string | null, page: number) {
  const params = new URLSearchParams({ page: String(page) });

  if (searchText !== "") {
    params.set("q", searchText);
  }

  if (batch !== null && batch !== "all") {
    params.set("batch", batch);
  }

  return params;
}

const initialState = { page: 0, batch: null };
const { useGlobalState } = createGlobalState(initialState);

export default function Command(props: { fallbackText?: string }) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [page, setPage] = useGlobalState("page");
  const [batch, setBatch] = useState<string | null>(null);
  const { data, isLoading } = useFetch<SearchResult>(
    "https://api.ycombinator.com/v0.1/companies?" + getSearchParams(searchText, batch, page).toString(),
    { keepPreviousData: true, execute: !!batch }
  );

  useEffect(() => {
    setPage(0);
  }, [batch, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search companies..."
      selectedItemId={data?.companies[0]?.id.toString()}
      searchBarAccessory={<BatchDropdown onChange={setBatch} />}
      onSearchTextChange={setSearchText}
      isShowingDetail
      throttle
    >
      {/* Need to check batch, otherwise List flickers because cache gets returned */}
      {batch && <ResultsListSection searchResult={data} batch={batch} />}
      {batch && batch !== "all" && <NavigationListSection searchResult={data} />}
    </List>
  );
}

function BatchDropdown({ onChange }: { onChange: (value: string | null) => void }) {
  return (
    <List.Dropdown tooltip="Filter Batch" onChange={onChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item icon={Icon.CricketBall} title="All Batches" value="all" />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {getBatches().map((batch) => (
          <List.Dropdown.Item icon={batch.icon} key={batch.value} title={batch.title} value={batch.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function ResultsListSection({ searchResult, batch }: { searchResult?: SearchResult; batch: string | null }) {
  return (
    <List.Section title="Results">
      {searchResult?.companies.map((company) => (
        <List.Item
          id={company.id.toString()}
          key={company.id}
          icon={{ source: company.smallLogoUrl ?? Icon.MinusCircle, mask: Image.Mask.RoundedRectangle }}
          title={company.name}
          accessories={[getBatchAccessory(company), getStatusAccessory(company)]}
          detail={
            <List.Item.Detail
              markdown={company.longDescription}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={company.name} />
                  <List.Item.Detail.Metadata.Separator />
                  {company.website && (
                    <>
                      <List.Item.Detail.Metadata.Link
                        title="Website"
                        text={getDomain(company.website)}
                        target={company.website}
                      />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  {company.oneLiner && (
                    <>
                      <List.Item.Detail.Metadata.Label title="One Liner" text={company.oneLiner} />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Industries">
                    {company.industries.map((industry) => (
                      <List.Item.Detail.Metadata.TagList.Item key={industry} text={industry} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  {company.locations && company.locations.length > 1 && (
                    <>
                      <List.Item.Detail.Metadata.Label title="Location" text={company.locations[0]} />
                      <List.Item.Detail.Metadata.Separator />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Label title="Team Size" text={String(company.teamSize)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title={company.name}>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={company.url} />
                <Action.OpenInBrowser title="Open Company Website" url={company.website} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={company.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Company Website"
                  content={company.website}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              </ActionPanel.Section>
              {batch && batch !== "all" && <NavigationActionSection searchResult={searchResult} />}
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function NavigationListSection(props: { searchResult?: SearchResult }) {
  return (
    <List.Section title="Navigation">
      {props.searchResult && props.searchResult.page > 0 && (
        <List.Item
          icon={{ source: Icon.ArrowLeftCircle, tintColor: Color.PrimaryText }}
          title="Previous Results"
          accessories={[
            { icon: Icon.Info, tooltip: `Use "⌘ + [" to load previous page or "⌘ + ⇧ + [" to go to first page` },
          ]}
          actions={
            <ActionPanel>
              <NavigationActionSection searchResult={props.searchResult} firstAction="previous-page" />
            </ActionPanel>
          }
        />
      )}
      {props.searchResult && props.searchResult.page < props.searchResult.totalPages - 1 && (
        <List.Item
          icon={{ source: Icon.ArrowRightCircle, tintColor: Color.PrimaryText }}
          title="Next Results"
          accessories={[
            { icon: Icon.Info, tooltip: `Use "⌘ + ]" to load next page or "⌘ + ⇧ + ]" to go to last page` },
          ]}
          actions={
            <ActionPanel>
              <NavigationActionSection searchResult={props.searchResult} firstAction="next-page" />
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  );
}

function NavigationActionSection({
  searchResult,
  firstAction,
}: {
  searchResult?: SearchResult;
  firstAction?: "next-page" | "previous-page";
}) {
  if (!searchResult) {
    return null;
  }

  return (
    <ActionPanel.Section title="Navigation">
      {firstAction === "next-page" ? (
        <>
          {searchResult.nextPage && <GoToNextPageAction />}
          {searchResult.page > 0 && <GoToPreviousPageAction />}
        </>
      ) : (
        <>
          {searchResult.page > 0 && <GoToPreviousPageAction />}
          {searchResult.nextPage && <GoToNextPageAction />}
        </>
      )}
      {searchResult.page < searchResult.totalPages - 1 && <GoToLastPageAction totalPages={searchResult.totalPages} />}
      {searchResult.page !== 0 && <GoToFirstPageAction />}
    </ActionPanel.Section>
  );
}

function GoToPreviousPageAction() {
  const [page, setPage] = useGlobalState("page");
  return (
    <Action
      icon={Icon.ArrowLeftCircle}
      title="Go to Previous Page"
      shortcut={{ modifiers: ["cmd"], key: "[" }}
      onAction={() => setPage(Math.max(page - 1, 0))}
    />
  );
}

function GoToNextPageAction() {
  const [page, setPage] = useGlobalState("page");
  return (
    <Action
      icon={Icon.ArrowRightCircle}
      title="Go to Next Page"
      shortcut={{ modifiers: ["cmd"], key: "]" }}
      onAction={() => setPage(page + 1)}
    />
  );
}

function GoToFirstPageAction() {
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={Icon.ArrowLeftCircleFilled}
      title="Go to First Page"
      shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
      onAction={() => setPage(0)}
    />
  );
}

function GoToLastPageAction({ totalPages }: { totalPages: number }) {
  const [, setPage] = useGlobalState("page");
  return (
    <Action
      icon={Icon.ArrowRightCircleFilled}
      title="Go to Last Page"
      shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
      onAction={() => setPage(totalPages)}
    />
  );
}
