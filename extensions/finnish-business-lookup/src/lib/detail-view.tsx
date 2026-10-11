import { Color, List } from "@raycast/api";
import { formatDate, getStatusText } from "./format";
import { escapeMarkdownText } from "./markdown";
import { buildMapSearchLinks } from "./maps";
import { getPrimaryAddressParts, getPrimaryAddressText } from "./selectors";
import type { UiCompany } from "../types/ui";
import { getLanguageFromOrder } from "./language";
import type { Language } from "./language";
import { getTranslator } from "./translations";

const NAME_HISTORY_PREVIEW_LIMIT = 2;

function getNameHistoryCount(previousCount: number, alternateCount: number, language: Language): string {
  const t = getTranslator(language);
  const counts: string[] = [];
  if (previousCount > 0) {
    counts.push(t(previousCount === 1 ? "previousCountOne" : "previousCount", { count: previousCount }));
  }
  if (alternateCount > 0) {
    counts.push(t(alternateCount === 1 ? "alternateCountOne" : "alternateCount", { count: alternateCount }));
  }

  return counts.join(", ");
}

export function buildSplitDetailMarkdown(company: UiCompany): string {
  return `# ${escapeMarkdownText(company.displayName)}`;
}

export function buildSplitDetailMetadata(company: UiCompany) {
  const language = getLanguageFromOrder(company.languageOrder);
  const t = getTranslator(language);
  const primaryAddress = getPrimaryAddressText(company);
  const addressParts = getPrimaryAddressParts(company);
  const mapLinks = buildMapSearchLinks(company.displayName, primaryAddress);
  const registrationDate = formatDate(company.registrationDate, language) ?? t("notAvailable");
  const endDate = formatDate(company.endDate, language) ?? t("notAvailable");
  const lastModified = formatDate(company.lastModified, language) ?? company.lastModified ?? t("notAvailable");
  const currentLegalName = company.currentLegalName ?? company.displayName;
  const businessStatus = getStatusText(company.businessIdStatusLabel, company.businessIdStatusCode, language);
  const tradeStatus = getStatusText(company.tradeRegisterStatusLabel, company.tradeRegisterStatusCode, language);
  const previousLegalNames = company.previousLegalNames ?? [];
  const alternateNames = company.alternateNames ?? [];
  const previousNamePreview = previousLegalNames.slice(0, NAME_HISTORY_PREVIEW_LIMIT);
  const alternateNamePreview = alternateNames.slice(0, NAME_HISTORY_PREVIEW_LIMIT);
  const additionalNameCount =
    previousLegalNames.length - previousNamePreview.length + (alternateNames.length - alternateNamePreview.length);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title={t("officialName")} text={currentLegalName} />
      <List.Item.Detail.Metadata.Label title="Y-tunnus" text={company.businessId} />
      {company.website ? (
        <List.Item.Detail.Metadata.Link title={t("website")} target={company.website} text={company.website} />
      ) : (
        <List.Item.Detail.Metadata.Label title={t("website")} text={t("notAvailable")} />
      )}
      {addressParts?.streetAddress ? (
        mapLinks ? (
          <List.Item.Detail.Metadata.Link
            title={t("streetAddress")}
            target={mapLinks.googleMaps}
            text={addressParts.streetAddress}
          />
        ) : (
          <List.Item.Detail.Metadata.Label title={t("streetAddress")} text={addressParts.streetAddress} />
        )
      ) : (
        <List.Item.Detail.Metadata.Label title={t("streetAddress")} text={t("notAvailable")} />
      )}
      {addressParts?.postOfficeBox ? (
        <List.Item.Detail.Metadata.Label title={t("postOfficeBox")} text={addressParts.postOfficeBox} />
      ) : null}
      <List.Item.Detail.Metadata.Label title={t("postalCode")} text={addressParts?.postalCode ?? t("notAvailable")} />
      <List.Item.Detail.Metadata.Label title={t("city")} text={addressParts?.city ?? t("notAvailable")} />
      {addressParts?.careOf ? <List.Item.Detail.Metadata.Label title={t("careOf")} text={addressParts.careOf} /> : null}
      {addressParts?.country ? (
        <List.Item.Detail.Metadata.Label title={t("country")} text={addressParts.country} />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title={t("status")}>
        <List.Item.Detail.Metadata.TagList.Item
          text={businessStatus}
          color={company.businessIdStatusCode === "2" ? Color.Green : undefined}
        />
        <List.Item.Detail.Metadata.TagList.Item text={tradeStatus} />
      </List.Item.Detail.Metadata.TagList>
      {company.companyFormLabel ? (
        <List.Item.Detail.Metadata.Label title={t("companyForm")} text={company.companyFormLabel} />
      ) : null}
      {company.mainBusinessLineLabel ? (
        <List.Item.Detail.Metadata.Label title={t("mainBusinessLine")} text={company.mainBusinessLineLabel} />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title={t("activeRegisterEntries")}
        text={String(company.activeRegisterCount ?? 0)}
      />
      {currentLegalName.toLowerCase() !== company.displayName.toLowerCase() ? (
        <List.Item.Detail.Metadata.Label title={t("currentLegalName")} text={currentLegalName} />
      ) : null}
      {previousLegalNames.length > 0 || alternateNames.length > 0 ? (
        <>
          <List.Item.Detail.Metadata.Label
            title={t("nameHistory")}
            text={getNameHistoryCount(previousLegalNames.length, alternateNames.length, language)}
          />
          {previousNamePreview.map((name, index) => (
            <List.Item.Detail.Metadata.Label
              key={`previous-${name}`}
              title={index === 0 ? t("previousName") : `${t("previousName")} ${index + 1}`}
              text={name}
            />
          ))}
          {alternateNamePreview.map((name, index) => (
            <List.Item.Detail.Metadata.Label
              key={`alternate-${name}`}
              title={index === 0 ? t("alternateName") : `${t("alternateName")} ${index + 1}`}
              text={name}
            />
          ))}
          {additionalNameCount > 0 ? (
            <List.Item.Detail.Metadata.Label
              title={t("moreNames")}
              text={t("moreInDetails", { count: additionalNameCount })}
            />
          ) : null}
        </>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      {company.euVatNumber ? (
        <List.Item.Detail.Metadata.Label title={t("vatNumber")} text={company.euVatNumber} />
      ) : null}
      <List.Item.Detail.Metadata.Label title={t("lastModified")} text={lastModified} />
      <List.Item.Detail.Metadata.Label title={t("registrationDate")} text={registrationDate} />
      <List.Item.Detail.Metadata.Label title={t("endDate")} text={endDate} />
    </List.Item.Detail.Metadata>
  );
}
