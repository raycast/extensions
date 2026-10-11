import { Action, ActionPanel, Detail, Icon, List, Keyboard, openExtensionPreferences } from "@raycast/api";
import { getRawCompanyApiUrl } from "./api/prh";
import CompanyDetail from "./components/company-detail";
import { usePrhSearch } from "./hooks/use-prh-search";
import { YTJ_SEARCH_URL, YTJ_SEARCH_URL_FI } from "./constants";
import { buildSplitDetailMetadata } from "./lib/detail-view";
import { buildEInvoiceDirectoryUrl } from "./lib/e-invoice";
import { buildMapSearchLinks } from "./lib/maps";
import { getPrimaryAddressClipboardText, getPrimaryAddressText } from "./lib/selectors";
import { buildWhatsNewMarkdown, getLatestWhatsNewLabel } from "./lib/whats-new";
import type { UiCompany } from "./types/ui";
import { getLanguage } from "./lib/localization";
import { getLanguageFromOrder } from "./lib/language";
import { getTranslator } from "./lib/translations";

function CompanyActions({ company, languageOrder }: { company: UiCompany; languageOrder: ("1" | "2" | "3")[] }) {
  const t = getTranslator(getLanguageFromOrder(languageOrder));
  const primaryAddress = getPrimaryAddressText(company);
  const clipboardAddress = getPrimaryAddressClipboardText(company);
  const mapLinks = buildMapSearchLinks(company.displayName, primaryAddress);

  return (
    <ActionPanel>
      <Action.Push
        title={t("viewDetails")}
        target={
          <CompanyDetail businessId={company.businessId} languageOrder={languageOrder} initialCompany={company} />
        }
      />
      <Action.CopyToClipboard
        title={t("copyYTunnus")}
        content={company.businessId}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {company.euVatNumber ? (
        <Action.CopyToClipboard title={t("copyVatNumber")} content={company.euVatNumber} icon={Icon.CopyClipboard} />
      ) : null}
      {clipboardAddress ? (
        <Action.CopyToClipboard
          title={t("copyAddress")}
          content={clipboardAddress}
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
      {mapLinks ? <Action.OpenInBrowser title={t("openGoogleMaps")} url={mapLinks.googleMaps} icon={Icon.Map} /> : null}
      {mapLinks ? <Action.OpenInBrowser title={t("openAppleMaps")} url={mapLinks.appleMaps} icon={Icon.Map} /> : null}
      {company.website ? (
        <Action.OpenInBrowser
          title={t("openWebsite")}
          url={company.website}
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      <Action.OpenInBrowser
        title={t("openEInvoice")}
        url={buildEInvoiceDirectoryUrl(company.businessId)}
        icon={Icon.Receipt}
        shortcut={Keyboard.Shortcut.Common.Edit}
      />
      <Action.OpenInBrowser title={t("openYtj")} url={languageOrder[0] === "1" ? YTJ_SEARCH_URL_FI : YTJ_SEARCH_URL} />
      <Action.OpenInBrowser title={t("openJson")} url={getRawCompanyApiUrl(company.businessId)} />
    </ActionPanel>
  );
}

export default function Command() {
  const language = getLanguage();
  const t = getTranslator(language);
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
      searchBarPlaceholder={t("searchPlaceholder")}
    >
      {trimmed.length === 0 ? (
        <List.Section title={t("getStarted")}>
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={t("searchBusinesses")}
            subtitle={t("startHint")}
            accessories={[{ text: "PRH YTJ" }]}
            actions={
              <ActionPanel>
                <Action title={t("openSettings")} icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {trimmed.length === 0 ? (
        <List.Section title={t("whatsNew")}>
          <List.Item
            icon={Icon.Bell}
            title={t("versionHistory")}
            subtitle={getLatestWhatsNewLabel(language)}
            accessories={[{ text: t("latest") }]}
            actions={
              <ActionPanel>
                <Action.Push title={t("viewWhatsNew")} target={<Detail markdown={buildWhatsNewMarkdown(language)} />} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {trimmed.length > 0 && classification.hint ? (
        <List.Section title={t("searchHint")}>
          <List.Item
            icon={Icon.Info}
            title={classification.hint}
            subtitle={t("noRequest")}
            accessories={[{ text: t("inputValidation") }]}
          />
        </List.Section>
      ) : null}

      {isSearchMode ? (
        <List.Section
          title={t("results")}
          subtitle={t("resultCount", { count: companies.length, total: totalResults })}
        >
          {companies.map((company) => (
            <List.Item
              key={company.businessId}
              icon={Icon.Building}
              title={{ value: company.displayName, tooltip: company.displayName }}
              detail={<List.Item.Detail metadata={buildSplitDetailMetadata(company)} />}
              actions={<CompanyActions company={company} languageOrder={languageOrder} />}
            />
          ))}

          {!isLoading && companies.length === 0 ? (
            <List.Item
              icon={Icon.XmarkCircle}
              title={t("noCompanies")}
              subtitle={t("noResults", { query: trimmed })}
              accessories={[{ text: t("tryAnotherQuery") }]}
            />
          ) : null}

          {hasMoreResults ? (
            <List.Item
              icon={isLoadingMore ? Icon.Clock : Icon.ChevronDown}
              title={isLoadingMore ? t("loadingMore") : t("loadMore")}
              subtitle={t("resultCount", { count: companies.length, total: totalResults })}
              accessories={[{ text: t("page", { page }) }]}
              actions={
                <ActionPanel>
                  <Action
                    title={t("loadMore")}
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
