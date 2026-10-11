import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getRawCompanyApiUrl, searchCompanies } from "../api/prh";
import { AUTHORITY_LABELS, REGISTER_LABELS, YTJ_SEARCH_URL, YTJ_SEARCH_URL_FI } from "../constants";
import { buildEInvoiceDirectoryUrl } from "../lib/e-invoice";
import { formatAddress, formatDate, getStatusText } from "../lib/format";
import { buildMapSearchLinks } from "../lib/maps";
import { escapeMarkdownText, formatMarkdownLink } from "../lib/markdown";
import {
  getEntryLabel,
  getNameTimelineEntries,
  getPrimaryAddressClipboardText,
  getPrimaryAddressText,
  getRegisteredEntriesGroups,
  hasCriticalDetailData,
  toUiCompany,
} from "../lib/selectors";
import type { PrhLanguageCode } from "../types/prh";
import type { UiCompany } from "../types/ui";
import { getLanguageFromOrder } from "../lib/language";
import type { Language } from "../lib/language";
import { getTranslator } from "../lib/translations";

interface CompanyDetailProps {
  businessId: string;
  languageOrder: PrhLanguageCode[];
  initialCompany?: UiCompany;
}

function buildAddressesMarkdown(company: UiCompany): string[] {
  const language = getLanguageFromOrder(company.languageOrder);
  const t = getTranslator(language);
  if (!company.addresses.length) {
    return [`- ${t("noAddresses")}`];
  }

  const lines = company.addresses
    .map((address) => {
      const formatted = formatAddress(address, company.languageOrder);
      if (!formatted) {
        return undefined;
      }

      const typeLabel =
        address.type === 1 ? t("street") : address.type === 2 ? t("postal") : t("type", { type: address.type });
      const mapLinks = buildMapSearchLinks(company.displayName, formatted);
      const addressText = mapLinks ? formatMarkdownLink(formatted, mapLinks.googleMaps) : escapeMarkdownText(formatted);
      const since = formatDate(address.registrationDate, language);
      const sinceText = since ? ` _(${t("since", { date: since })})_` : "";

      return `- ${typeLabel}: ${addressText}${sinceText}`;
    })
    .filter((line): line is string => Boolean(line));

  if (!lines.length) {
    return [`- ${t("noAddresses")}`];
  }

  return lines;
}

function formatDateRange(
  registrationDate: string | null | undefined,
  endDate: string | null | undefined,
  language: Language,
): string {
  const t = getTranslator(language);
  const since = formatDate(registrationDate, language);
  const until = formatDate(endDate, language);

  if (since && until) {
    return `${since} – ${until}`;
  }

  if (since) {
    return t("since", { date: since });
  }

  if (until) {
    return t("ended", { date: until });
  }

  return t("noDate");
}

function getNameCategoryLabel(category: "current-legal" | "previous-legal" | "alternate", language: Language): string {
  const t = getTranslator(language);
  if (category === "current-legal") {
    return t("currentLegal");
  }

  if (category === "previous-legal") {
    return t("previousLegal");
  }

  return t("alternateName");
}

function buildNameTimelineMarkdown(company: UiCompany): string {
  const language = getLanguageFromOrder(company.languageOrder);
  const t = getTranslator(language);
  const timelineEntries = getNameTimelineEntries(company.raw.names ?? []);

  if (!timelineEntries.length) {
    return `## ${t("names")}
- ${t("noNames")}
`;
  }

  const lines = timelineEntries.map((entry) => {
    const categoryLabel = getNameCategoryLabel(entry.category, language);
    return `- ${escapeMarkdownText(entry.name)} (${categoryLabel}; ${formatDateRange(entry.registrationDate, entry.endDate, language)})`;
  });

  return `## ${t("names")}
${lines.join("\n")}
`;
}

function buildRegisterGroupsMarkdown(company: UiCompany, languageOrder: PrhLanguageCode[]): string {
  const language = getLanguageFromOrder(languageOrder);
  const t = getTranslator(language);
  const groups = getRegisteredEntriesGroups(company.registeredEntries);

  if (!groups.length) {
    return `## ${t("registers")}
- ${t("noRegisters")}
`;
  }

  const sections: string[] = [`## ${t("registers")}`];

  for (const group of groups) {
    const registerKey = REGISTER_LABELS[group.register];
    const registerLabel = registerKey ? t(registerKey) : t("register", { register: group.register });
    sections.push(`### ${escapeMarkdownText(registerLabel)}`);

    if (group.activeEntries.length) {
      sections.push(`- ${t("active")}`);
      for (const entry of group.activeEntries) {
        const label = getEntryLabel(entry, languageOrder);
        const authorityKey = AUTHORITY_LABELS[entry.authority];
        const authority = authorityKey ? t(authorityKey) : t("authority", { authority: entry.authority });
        const dateText = formatDateRange(entry.registrationDate, entry.endDate, language);
        sections.push(`  - ${escapeMarkdownText(label)} (${escapeMarkdownText(authority)}; ${dateText})`);
      }
    }

    if (group.inactiveEntries.length) {
      sections.push(`- ${t("inactive")}`);
      for (const entry of group.inactiveEntries) {
        const label = getEntryLabel(entry, languageOrder);
        const authorityKey = AUTHORITY_LABELS[entry.authority];
        const authority = authorityKey ? t(authorityKey) : t("authority", { authority: entry.authority });
        const dateText = formatDateRange(entry.registrationDate, entry.endDate, language);
        sections.push(`  - ${escapeMarkdownText(label)} (${escapeMarkdownText(authority)}; ${dateText})`);
      }
    }
  }

  return `${sections.join("\n")}
`;
}

function buildMarkdown(company: UiCompany): string {
  const language = getLanguageFromOrder(company.languageOrder);
  const t = getTranslator(language);
  const currentLegalName = company.currentLegalName ?? company.displayName;
  const primaryAddress = getPrimaryAddressText(company);
  const status = getStatusText(company.businessIdStatusLabel, company.businessIdStatusCode, language);
  const tradeStatus = getStatusText(company.tradeRegisterStatusLabel, company.tradeRegisterStatusCode, language);
  const companyFormText = getStatusText(company.companyFormLabel, company.companyFormCode, language);
  const mainBusinessLineText = getStatusText(company.mainBusinessLineLabel, company.mainBusinessLineCode, language);
  const namesSection = buildNameTimelineMarkdown(company);
  const addressLines = buildAddressesMarkdown(company).join("\n");
  const registersSection = buildRegisterGroupsMarkdown(company, company.languageOrder);
  const lastModified = formatDate(company.lastModified, language) ?? company.lastModified ?? t("notAvailable");

  return `# ${escapeMarkdownText(company.displayName)}

## ${t("atAGlance")}
- ${t("officialName")}: ${escapeMarkdownText(currentLegalName)}
- Y-tunnus: ${escapeMarkdownText(company.businessId)}
- ${t("businessIdStatus")}: ${escapeMarkdownText(status)}
- ${t("tradeRegisterStatus")}: ${escapeMarkdownText(tradeStatus)}
- ${t("companyForm")}: ${escapeMarkdownText(companyFormText)}
- ${t("lastModified")}: ${escapeMarkdownText(lastModified)}

## ${t("profile")}
- EUID: ${company.euId ? escapeMarkdownText(company.euId) : t("notAvailable")}
- ${t("vatNumber")}: ${company.euVatNumber ? escapeMarkdownText(company.euVatNumber) : t("notAvailable")}
- ${t("mainBusinessLine")}: ${escapeMarkdownText(mainBusinessLineText)}
- ${t("website")}: ${company.website ? formatMarkdownLink(company.website, company.website) : t("notAvailable")}
- ${t("primaryAddress")}: ${primaryAddress ? escapeMarkdownText(primaryAddress) : t("notAvailable")}

${namesSection}

## ${t("addresses")}
${addressLines}

${registersSection}

## ${t("dates")}
- ${t("registrationDate")}: ${formatDate(company.registrationDate, language) ?? t("notAvailable")}
- ${t("endDate")}: ${formatDate(company.endDate, language) ?? t("notAvailable")}
- ${t("lastModified")}: ${escapeMarkdownText(lastModified)}
`;
}

export default function CompanyDetail({ businessId, languageOrder, initialCompany }: CompanyDetailProps) {
  const language = getLanguageFromOrder(languageOrder);
  const t = useMemo(() => getTranslator(language), [language]);
  const [company, setCompany] = useState<UiCompany | undefined>(initialCompany);
  const shouldFetchDetails = !hasCriticalDetailData(initialCompany);
  const [isLoading, setIsLoading] = useState(shouldFetchDetails);

  useEffect(() => {
    const controller = new AbortController();

    if (!shouldFetchDetails) {
      setCompany(initialCompany);
      setIsLoading(false);
      return () => {
        controller.abort();
      };
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await searchCompanies({ businessId, page: 1, language }, controller.signal);
        const exact =
          response.companies.find((entry) => entry.businessId.value === businessId) ?? response.companies[0];

        if (!exact) {
          return;
        }

        setCompany(toUiCompany(exact, languageOrder));
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        await showFailureToast(error, { title: t("detailsFailed") });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [businessId, initialCompany, language, languageOrder, shouldFetchDetails, t]);

  const displayedCompany = company ?? initialCompany;

  const markdown = useMemo(() => {
    if (!displayedCompany) {
      return `# ${t("companyDetails")}\n\n${t("noCompanyData")}`;
    }

    return buildMarkdown(displayedCompany);
  }, [displayedCompany, t]);

  const primaryAddress = displayedCompany ? getPrimaryAddressText(displayedCompany) : undefined;
  const clipboardAddress = displayedCompany ? getPrimaryAddressClipboardText(displayedCompany) : undefined;
  const previousTradeNames = displayedCompany?.previousLegalNames ?? [];
  const previousTradeNamesPreview = previousTradeNames.slice(0, 4);
  const additionalPreviousTradeNameCount =
    previousTradeNames.length > previousTradeNamesPreview.length
      ? previousTradeNames.length - previousTradeNamesPreview.length
      : 0;
  const rawCompanyUrl = getRawCompanyApiUrl(businessId);
  const mapLinks = displayedCompany ? buildMapSearchLinks(displayedCompany.displayName, primaryAddress) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        displayedCompany ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title={t("businessId")} text={displayedCompany.businessId} />
            {displayedCompany.euVatNumber ? (
              <Detail.Metadata.Label title={t("vatNumber")} text={displayedCompany.euVatNumber} />
            ) : null}
            {displayedCompany.euId ? <Detail.Metadata.Label title="EUID" text={displayedCompany.euId} /> : null}
            {displayedCompany.companyFormLabel ? (
              <Detail.Metadata.Label title={t("companyForm")} text={displayedCompany.companyFormLabel} />
            ) : null}
            {displayedCompany.currentLegalName ? (
              <Detail.Metadata.Label title={t("currentLegalName")} text={displayedCompany.currentLegalName} />
            ) : null}
            <Detail.Metadata.TagList title={t("previousTradeNames")}>
              {previousTradeNamesPreview.length > 0 ? (
                previousTradeNamesPreview.map((name) => <Detail.Metadata.TagList.Item key={name} text={name} />)
              ) : (
                <Detail.Metadata.TagList.Item text={t("none")} />
              )}
              {additionalPreviousTradeNameCount > 0 ? (
                <Detail.Metadata.TagList.Item
                  text={t(additionalPreviousTradeNameCount === 1 ? "moreOne" : "more", {
                    count: additionalPreviousTradeNameCount,
                  })}
                  color="secondaryText"
                />
              ) : null}
            </Detail.Metadata.TagList>
            {displayedCompany.mainBusinessLineLabel ? (
              <Detail.Metadata.Label title={t("mainBusinessLine")} text={displayedCompany.mainBusinessLineLabel} />
            ) : null}
            {displayedCompany.website ? (
              <Detail.Metadata.Link
                title={t("website")}
                text={displayedCompany.website}
                target={displayedCompany.website}
              />
            ) : null}
            <Detail.Metadata.Label
              title={t("registrationDate")}
              text={formatDate(displayedCompany.registrationDate, language) ?? t("notAvailable")}
            />
            <Detail.Metadata.Label
              title={t("endDate")}
              text={formatDate(displayedCompany.endDate, language) ?? t("notAvailable")}
            />
            <Detail.Metadata.Label
              title={t("lastModified")}
              text={
                formatDate(displayedCompany.lastModified, language) ??
                displayedCompany.lastModified ??
                t("notAvailable")
              }
            />
            {primaryAddress ? <Detail.Metadata.Label title={t("primaryAddress")} text={primaryAddress} /> : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {displayedCompany ? (
            <Action.CopyToClipboard
              title={t("copyBusinessId")}
              content={displayedCompany.businessId}
              icon={Icon.Clipboard}
            />
          ) : null}
          {displayedCompany?.euVatNumber ? (
            <Action.CopyToClipboard
              title={t("copyVatNumber")}
              content={displayedCompany.euVatNumber}
              icon={Icon.CopyClipboard}
            />
          ) : null}
          {clipboardAddress ? (
            <Action.CopyToClipboard
              title={t("copyAddress")}
              content={clipboardAddress}
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {displayedCompany?.website ? (
            <Action.OpenInBrowser title={t("openWebsite")} url={displayedCompany.website} />
          ) : null}
          {displayedCompany ? (
            <Action.OpenInBrowser
              title={t("openEInvoice")}
              url={buildEInvoiceDirectoryUrl(displayedCompany.businessId)}
              icon={Icon.Receipt}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          ) : null}
          {mapLinks ? (
            <Action.OpenInBrowser title={t("openGoogleMaps")} url={mapLinks.googleMaps} icon={Icon.Map} />
          ) : null}
          {mapLinks ? (
            <Action.OpenInBrowser title={t("openAppleMaps")} url={mapLinks.appleMaps} icon={Icon.Map} />
          ) : null}
          <Action.OpenInBrowser
            title={t("openYtj")}
            url={language === "fi" ? YTJ_SEARCH_URL_FI : YTJ_SEARCH_URL}
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser title={t("openJson")} url={rawCompanyUrl} icon={Icon.Terminal} />
        </ActionPanel>
      }
    />
  );
}
