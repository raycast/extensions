import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { getRawCompanyApiUrl } from "./api/prh";
import CompanyDetail from "./components/company-detail";
import { usePrhSearch } from "./hooks/use-prh-search";
import { YTJ_SEARCH_URL } from "./constants";
import { buildSplitDetailMetadata } from "./lib/detail-view";
import { buildMapSearchLinks } from "./lib/maps";
import { getPrimaryAddressText, getPrimaryCity } from "./lib/selectors";
import { buildWhatsNewMarkdown, getLatestWhatsNewLabel } from "./lib/whats-new";
import type { UiCompany } from "./types/ui";

function CompanyActions({ company, languageOrder }: { company: UiCompany; languageOrder: ("1" | "2" | "3")[] }) {
  const primaryAddress = getPrimaryAddressText(company);
  const mapLinks = buildMapSearchLinks(company.displayName, primaryAddress);

  return (
    <ActionPanel>
      <Action.Push
        title="View Details"
        target={
          <CompanyDetail businessId={company.businessId} languageOrder={languageOrder} initialCompany={company} />
        }
      />
      <Action.CopyToClipboard title="Copy Business ID" content={company.businessId} />
      {company.euVatNumber ? <Action.CopyToClipboard title="Copy EU VAT Number" content={company.euVatNumber} /> : null}
      {primaryAddress ? <Action.CopyToClipboard title="Copy Primary Address" content={primaryAddress} /> : null}
      {mapLinks ? <Action.OpenInBrowser title="Open in Google Maps" url={mapLinks.googleMaps} icon={Icon.Map} /> : null}
      {mapLinks ? <Action.OpenInBrowser title="Open in Apple Maps" url={mapLinks.appleMaps} icon={Icon.Map} /> : null}
      {company.website ? <Action.OpenInBrowser title="Open Website" url={company.website} /> : null}
      <Action.OpenInBrowser title="Open YTJ Search Page" url={YTJ_SEARCH_URL} />
      <Action.OpenInBrowser title="Open Raw PRH JSON" url={getRawCompanyApiUrl(company.businessId)} />
    </ActionPanel>
  );
}

function getResultSectionSubtitle(companiesCount: number, totalResults: number): string {
  return `${companiesCount} of ${totalResults}`;
}

const WHATS_NEW_MARKDOWN = buildWhatsNewMarkdown();
const LATEST_WHATS_NEW_LABEL = getLatestWhatsNewLabel();
const SEARCH_PLACEHOLDER = "Name or Business ID (e.g. Nokia, 0112038-9)";

export default function Command() {
  const {
    searchText,
    setSearchText,
    classification,
    companies,
    isLoading,
    isLoadingMore,
    totalResults,
    hasMoreResults,
    page,
    loadNextPage,
    languageOrder,
  } = usePrhSearch();

  const trimmed = searchText.trim();
  const isSearchMode = trimmed.length > 0 && (classification.kind === "businessId" || classification.kind === "name");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isSearchMode}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder={SEARCH_PLACEHOLDER}
    >
      {trimmed.length === 0 ? (
        <List.Section title="Get Started">
          <List.Item
            icon={Icon.MagnifyingGlass}
            title="Search Finnish Businesses"
            subtitle="Type company name or Business ID to start"
            accessories={[{ text: "PRH YTJ" }]}
          />
        </List.Section>
      ) : null}

      {trimmed.length === 0 ? (
        <List.Section title="What's New">
          <List.Item
            icon={Icon.Bell}
            title="Version History"
            subtitle={LATEST_WHATS_NEW_LABEL}
            accessories={[{ text: "Latest" }]}
            actions={
              <ActionPanel>
                <Action.Push title="View What's New" target={<Detail markdown={WHATS_NEW_MARKDOWN} />} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {trimmed.length > 0 && classification.hint ? (
        <List.Section title="Search Hint">
          <List.Item
            icon={Icon.Info}
            title={classification.hint}
            subtitle="No API request was made"
            accessories={[{ text: "Input validation" }]}
          />
        </List.Section>
      ) : null}

      {isSearchMode ? (
        <List.Section title="Results" subtitle={getResultSectionSubtitle(companies.length, totalResults)}>
          {companies.map((company) => {
            const primaryCity = getPrimaryCity(company);

            return (
              <List.Item
                key={company.businessId}
                icon={Icon.Building}
                title={company.displayName}
                subtitle={company.businessId}
                accessories={primaryCity ? [{ text: primaryCity }] : undefined}
                detail={<List.Item.Detail metadata={buildSplitDetailMetadata(company)} />}
                actions={<CompanyActions company={company} languageOrder={languageOrder} />}
              />
            );
          })}

          {!isLoading && companies.length === 0 ? (
            <List.Item
              icon={Icon.XmarkCircle}
              title="No Companies Found"
              subtitle={`No results for "${trimmed}"`}
              accessories={[{ text: "Try another query" }]}
            />
          ) : null}

          {hasMoreResults ? (
            <List.Item
              icon={isLoadingMore ? Icon.Clock : Icon.ChevronDown}
              title={isLoadingMore ? "Loading More Results..." : "Load More Results"}
              subtitle={`${companies.length} of ${totalResults}`}
              accessories={[{ text: `Page ${page}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Load More Results"
                    icon={Icon.ChevronDown}
                    onAction={() => {
                      loadNextPage();
                    }}
                  />
                </ActionPanel>
              }
            />
          ) : null}
        </List.Section>
      ) : null}
    </List>
  );
}
