import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getRawCompanyApiUrl, searchCompanies } from "../api/prh";
import { AUTHORITY_LABELS, REGISTER_LABELS, YTJ_SEARCH_URL } from "../constants";
import { formatAddress, formatDate } from "../lib/format";
import { buildMapSearchLinks } from "../lib/maps";
import {
  getEntryLabel,
  getNameTimelineEntries,
  getPrimaryAddressText,
  getRegisteredEntriesGroups,
  hasCriticalDetailData,
  toUiCompany,
} from "../lib/selectors";
import type { PrhLanguageCode } from "../types/prh";
import type { UiCompany } from "../types/ui";

interface CompanyDetailProps {
  businessId: string;
  languageOrder: PrhLanguageCode[];
  initialCompany?: UiCompany;
}

function getStatusText(label?: string, code?: string): string {
  if (label && code) {
    return `${label} (${code})`;
  }

  if (label) {
    return label;
  }

  if (code) {
    return `Code ${code}`;
  }

  return "Not available";
}

function normalizeMarkdownText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeMarkdownText(value: string): string {
  return normalizeMarkdownText(value)
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]{}()#+.!|>-])/g, "\\$1");
}

function escapeMarkdownLinkTarget(target: string): string {
  return target.replace(/\s/g, "%20").replace(/>/g, "%3E");
}

function formatMarkdownLink(text: string, target: string): string {
  return `[${escapeMarkdownText(text)}](<${escapeMarkdownLinkTarget(target)}>)`;
}

function buildAddressesMarkdown(company: UiCompany): string[] {
  if (!company.addresses.length) {
    return ["- No addresses available"];
  }

  const lines = company.addresses
    .map((address) => {
      const formatted = formatAddress(address, company.languageOrder);
      if (!formatted) {
        return undefined;
      }

      const typeLabel = address.type === 1 ? "Street" : address.type === 2 ? "Postal" : `Type ${address.type}`;
      const mapLinks = buildMapSearchLinks(company.displayName, formatted);
      const addressText = mapLinks ? formatMarkdownLink(formatted, mapLinks.googleMaps) : escapeMarkdownText(formatted);
      const since = formatDate(address.registrationDate);
      const sinceText = since ? ` _(since ${since})_` : "";

      return `- ${typeLabel}: ${addressText}${sinceText}`;
    })
    .filter((line): line is string => Boolean(line));

  if (!lines.length) {
    return ["- No addresses available"];
  }

  return lines;
}

function formatDateRange(registrationDate?: string | null, endDate?: string | null): string {
  const since = formatDate(registrationDate);
  const until = formatDate(endDate);

  if (since && until) {
    return `${since} -> ${until}`;
  }

  if (since) {
    return `since ${since}`;
  }

  if (until) {
    return `ended ${until}`;
  }

  return "date not available";
}

function getNameCategoryLabel(category: "current-legal" | "previous-legal" | "alternate"): string {
  if (category === "current-legal") {
    return "Current legal";
  }

  if (category === "previous-legal") {
    return "Previous legal";
  }

  return "Alternate name";
}

function buildNameTimelineMarkdown(company: UiCompany): string {
  const timelineEntries = getNameTimelineEntries(company.raw.names ?? []);

  if (!timelineEntries.length) {
    return `## Names
- No name history available
`;
  }

  const lines = timelineEntries.map((entry) => {
    const categoryLabel = getNameCategoryLabel(entry.category);
    return `- ${escapeMarkdownText(entry.name)} (${categoryLabel}; ${formatDateRange(entry.registrationDate, entry.endDate)})`;
  });

  return `## Names
${lines.join("\n")}
`;
}

function buildRegisterGroupsMarkdown(company: UiCompany, languageOrder: PrhLanguageCode[]): string {
  const groups = getRegisteredEntriesGroups(company.registeredEntries);

  if (!groups.length) {
    return `## Registers
- No register entries available
`;
  }

  const sections: string[] = ["## Registers"];

  for (const group of groups) {
    const registerLabel = REGISTER_LABELS[group.register] ?? `Register ${group.register}`;
    sections.push(`### ${escapeMarkdownText(registerLabel)}`);

    if (group.activeEntries.length) {
      sections.push("- Active");
      for (const entry of group.activeEntries) {
        const label = getEntryLabel(entry, languageOrder);
        const authority = AUTHORITY_LABELS[entry.authority] ?? `Authority ${entry.authority}`;
        const dateText = formatDateRange(entry.registrationDate, entry.endDate);
        sections.push(`  - ${escapeMarkdownText(label)} (${escapeMarkdownText(authority)}; ${dateText})`);
      }
    }

    if (group.inactiveEntries.length) {
      sections.push("- Inactive");
      for (const entry of group.inactiveEntries) {
        const label = getEntryLabel(entry, languageOrder);
        const authority = AUTHORITY_LABELS[entry.authority] ?? `Authority ${entry.authority}`;
        const dateText = formatDateRange(entry.registrationDate, entry.endDate);
        sections.push(`  - ${escapeMarkdownText(label)} (${escapeMarkdownText(authority)}; ${dateText})`);
      }
    }
  }

  return `${sections.join("\n")}
`;
}

function buildMarkdown(company: UiCompany): string {
  const currentLegalName = company.currentLegalName ?? company.displayName;
  const primaryAddress = getPrimaryAddressText(company);
  const status = getStatusText(company.businessIdStatusLabel, company.businessIdStatusCode);
  const tradeStatus = getStatusText(company.tradeRegisterStatusLabel, company.tradeRegisterStatusCode);
  const companyFormText = getStatusText(company.companyFormLabel, company.companyFormCode);
  const mainBusinessLineText = getStatusText(company.mainBusinessLineLabel, company.mainBusinessLineCode);
  const namesSection = buildNameTimelineMarkdown(company);
  const addressLines = buildAddressesMarkdown(company).join("\n");
  const registersSection = buildRegisterGroupsMarkdown(company, company.languageOrder);
  const lastModified = formatDate(company.lastModified) ?? company.lastModified ?? "Not available";

  return `# ${escapeMarkdownText(company.displayName)}

## At a Glance
- Official name: ${escapeMarkdownText(currentLegalName)}
- Y-tunnus: ${escapeMarkdownText(company.businessId)}
- Business ID status: ${escapeMarkdownText(status)}
- Trade register status: ${escapeMarkdownText(tradeStatus)}
- Company form: ${escapeMarkdownText(companyFormText)}
- Last modified: ${escapeMarkdownText(lastModified)}

## Profile
- EUID: ${company.euId ? escapeMarkdownText(company.euId) : "Not available"}
- EU VAT number: ${company.euVatNumber ? escapeMarkdownText(company.euVatNumber) : "Not available"}
- Main business line: ${escapeMarkdownText(mainBusinessLineText)}
- Website: ${company.website ? formatMarkdownLink(company.website, company.website) : "Not available"}
- Primary address: ${primaryAddress ? escapeMarkdownText(primaryAddress) : "Not available"}

${namesSection}

## Addresses
${addressLines}

${registersSection}

## Dates
- Registration date: ${formatDate(company.registrationDate) ?? "Not available"}
- End date: ${formatDate(company.endDate) ?? "Not available"}
- Last modified: ${escapeMarkdownText(lastModified)}
`;
}

export default function CompanyDetail({ businessId, languageOrder, initialCompany }: CompanyDetailProps) {
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
        const response = await searchCompanies({ businessId, page: 1 }, controller.signal);
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

        await showFailureToast(error, { title: "Failed to load company details" });
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
  }, [businessId, initialCompany, languageOrder, shouldFetchDetails]);

  const displayedCompany = company ?? initialCompany;

  const markdown = useMemo(() => {
    if (!displayedCompany) {
      return "# Company details\n\nCompany data is not available.";
    }

    return buildMarkdown(displayedCompany);
  }, [displayedCompany]);

  const primaryAddress = displayedCompany ? getPrimaryAddressText(displayedCompany) : undefined;
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
            <Detail.Metadata.Label title="Business ID" text={displayedCompany.businessId} />
            {displayedCompany.euVatNumber ? (
              <Detail.Metadata.Label title="EU VAT Number" text={displayedCompany.euVatNumber} />
            ) : null}
            {displayedCompany.euId ? <Detail.Metadata.Label title="EUID" text={displayedCompany.euId} /> : null}
            {displayedCompany.companyFormLabel ? (
              <Detail.Metadata.Label title="Company Form" text={displayedCompany.companyFormLabel} />
            ) : null}
            {displayedCompany.currentLegalName ? (
              <Detail.Metadata.Label title="Current Legal Name" text={displayedCompany.currentLegalName} />
            ) : null}
            <Detail.Metadata.TagList title="Previous Trade Names">
              {previousTradeNamesPreview.length > 0 ? (
                previousTradeNamesPreview.map((name) => <Detail.Metadata.TagList.Item key={name} text={name} />)
              ) : (
                <Detail.Metadata.TagList.Item text="None" />
              )}
              {additionalPreviousTradeNameCount > 0 ? (
                <Detail.Metadata.TagList.Item
                  text={`+${additionalPreviousTradeNameCount} more`}
                  color="secondaryText"
                />
              ) : null}
            </Detail.Metadata.TagList>
            {displayedCompany.mainBusinessLineLabel ? (
              <Detail.Metadata.Label title="Main Business Line" text={displayedCompany.mainBusinessLineLabel} />
            ) : null}
            {displayedCompany.website ? (
              <Detail.Metadata.Link title="Website" text={displayedCompany.website} target={displayedCompany.website} />
            ) : null}
            <Detail.Metadata.Label
              title="Registration Date"
              text={formatDate(displayedCompany.registrationDate) ?? "Not available"}
            />
            <Detail.Metadata.Label title="End Date" text={formatDate(displayedCompany.endDate) ?? "Not available"} />
            <Detail.Metadata.Label
              title="Last Modified"
              text={formatDate(displayedCompany.lastModified) ?? displayedCompany.lastModified ?? "Not available"}
            />
            {primaryAddress ? <Detail.Metadata.Label title="Primary Address" text={primaryAddress} /> : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {displayedCompany ? (
            <Action.CopyToClipboard
              title="Copy Business ID"
              content={displayedCompany.businessId}
              icon={Icon.Clipboard}
            />
          ) : null}
          {displayedCompany?.euVatNumber ? (
            <Action.CopyToClipboard
              title="Copy EU VAT Number"
              content={displayedCompany.euVatNumber}
              icon={Icon.CopyClipboard}
            />
          ) : null}
          {primaryAddress ? (
            <Action.CopyToClipboard title="Copy Primary Address" content={primaryAddress} icon={Icon.CopyClipboard} />
          ) : null}
          {displayedCompany?.website ? (
            <Action.OpenInBrowser title="Open Website" url={displayedCompany.website} />
          ) : null}
          {mapLinks ? (
            <Action.OpenInBrowser title="Open in Google Maps" url={mapLinks.googleMaps} icon={Icon.Map} />
          ) : null}
          {mapLinks ? (
            <Action.OpenInBrowser title="Open in Apple Maps" url={mapLinks.appleMaps} icon={Icon.Map} />
          ) : null}
          <Action.OpenInBrowser title="Open YTJ Search Page" url={YTJ_SEARCH_URL} icon={Icon.Globe} />
          <Action.OpenInBrowser title="Open Raw PRH JSON" url={rawCompanyUrl} icon={Icon.Terminal} />
        </ActionPanel>
      }
    />
  );
}
