import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useCachedState,
} from "@raycast/utils";
import { useState } from "react";

import { searchCompanies } from "./api";
import { CompanyListItem } from "./components/CompanyListItem";
import { CompanyProfile } from "./components/CompanyProfile";
import { companyStatusLabel, companyWebUrl, statusColor } from "./helpers";
import { createSearchFetcher } from "./pagination";
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
    createSearchFetcher(searchCompanies),
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
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <ActionPanel.Section>
            <Action
              title="Clear Recently Viewed"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={async () => {
                try {
                  await clearRecentlyViewedCompanies();
                } catch (error) {
                  await showFailureToast(error, {
                    title: "Could Not Clear Recently Viewed",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
