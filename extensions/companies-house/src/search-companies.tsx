import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { searchCompanies } from "./api";
import { CompanyListItem } from "./components/CompanyListItem";
import { CompanyProfile } from "./components/CompanyProfile";
import { PAGE_SIZE, SEARCH_INDEX_LIMIT } from "./constants";
import { companyStatusLabel, companyWebUrl, statusColor } from "./helpers";
import {
  clearRecentlyViewedCompanies,
  useRecentlyViewedCompanies,
  type RecentCompany,
} from "./recently-viewed";

export default function SearchCompanies() {
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useCachedState(
    "companies-show-detail",
    false,
  );
  const { recent, isLoading: isLoadingRecent } = useRecentlyViewedCompanies();

  const { isLoading, data, pagination, error } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      if (!query.trim()) return { data: [], hasMore: false };
      const startIndex = options.page * PAGE_SIZE;
      const res = await searchCompanies(query.trim(), startIndex);
      const items = res.items ?? [];
      const total = res.total_results ?? items.length;
      // Companies House refuses a start_index of 1000 or more with a 416, so
      // paging to the reported total would end in an error toast rather than
      // the end of the list.
      const next = startIndex + items.length;
      return {
        data: items,
        hasMore: next < total && next < SEARCH_INDEX_LIMIT,
      };
    },
    [searchText],
    { keepPreviousData: true },
  );

  // The recent list belongs to the blank search box only. Once someone is
  // searching, showing it alongside results would put companies in front of
  // them that do not match what they typed.
  const showRecent = !searchText.trim() && recent.length > 0;

  return (
    <List
      isLoading={isLoading || isLoadingRecent}
      isShowingDetail={showDetail}
      throttle
      pagination={pagination}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search companies by name or number…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={showDetail ? "detail" : "list"}
          onChange={(value) => setShowDetail(value === "detail")}
        >
          <List.Dropdown.Item title="List View" value="list" />
          <List.Dropdown.Item title="List & Detail" value="detail" />
        </List.Dropdown>
      }
    >
      {data?.length ? (
        data.map((item) => (
          <CompanyListItem
            key={item.company_number}
            item={item}
            showingDetail={showDetail}
            onToggleDetail={() => setShowDetail((previous) => !previous)}
          />
        ))
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't Load Companies"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : showRecent ? (
        <List.Section title="Recently Viewed">
          {recent.map((company) => (
            <RecentCompanyItem
              key={company.companyNumber}
              company={company}
              showingDetail={showDetail}
            />
          ))}
        </List.Section>
      ) : searchText && isLoading ? (
        <List.EmptyView icon={Icon.Clock} title="Searching…" />
      ) : searchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Companies Found"
          description="Try a different name or number."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Building}
          title="Search Companies House"
          description="Start typing a company name or number."
        />
      )}
    </List>
  );
}

function RecentCompanyItem({
  company,
  showingDetail,
}: {
  company: RecentCompany;
  showingDetail: boolean;
}) {
  const title = company.name ?? company.companyNumber;
  // The status was recorded when the company was viewed, so it is labelled as
  // "when viewed" rather than presented as the register's position today.
  const statusLabel = companyStatusLabel(company.status);

  return (
    <List.Item
      title={title}
      subtitle={showingDetail ? undefined : company.companyNumber}
      icon={Icon.Clock}
      accessories={
        showingDetail || !statusLabel
          ? undefined
          : [
              {
                tag: { value: statusLabel, color: statusColor(company.status) },
              },
            ]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Company Number"
                text={company.companyNumber}
              />
              {statusLabel ? (
                <List.Item.Detail.Metadata.TagList title="Status When Viewed">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={statusLabel}
                    color={statusColor(company.status)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Company"
            icon={Icon.Building}
            target={
              <CompanyProfile
                companyNumber={company.companyNumber}
                name={company.name}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={companyWebUrl(company.companyNumber)}
          />
          <Action.CopyToClipboard
            title="Copy Company Number"
            content={company.companyNumber}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <ActionPanel.Section>
            <Action
              title="Clear Recently Viewed"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => void clearRecentlyViewedCompanies()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
