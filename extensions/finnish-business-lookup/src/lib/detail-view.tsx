import { Color, List } from "@raycast/api";
import { formatDate, getStatusText } from "./format";
import { escapeMarkdownText } from "./markdown";
import { buildMapSearchLinks } from "./maps";
import { getPrimaryAddressParts, getPrimaryAddressText } from "./selectors";
import type { UiCompany } from "../types/ui";

const NAME_HISTORY_PREVIEW_LIMIT = 2;

function getNameHistoryCount(previousCount: number, alternateCount: number): string {
  const counts: string[] = [];
  if (previousCount > 0) {
    counts.push(`${previousCount} previous`);
  }
  if (alternateCount > 0) {
    counts.push(`${alternateCount} alternate`);
  }

  return counts.join(", ");
}

export function buildSplitDetailMarkdown(company: UiCompany): string {
  return `# ${escapeMarkdownText(company.displayName)}`;
}

export function buildSplitDetailMetadata(company: UiCompany) {
  const primaryAddress = getPrimaryAddressText(company);
  const addressParts = getPrimaryAddressParts(company);
  const mapLinks = buildMapSearchLinks(company.displayName, primaryAddress);
  const registrationDate = formatDate(company.registrationDate) ?? "Not available";
  const endDate = formatDate(company.endDate) ?? "Not available";
  const lastModified = formatDate(company.lastModified) ?? company.lastModified ?? "Not available";
  const currentLegalName = company.currentLegalName ?? company.displayName;
  const businessStatus = getStatusText(company.businessIdStatusLabel, company.businessIdStatusCode);
  const tradeStatus = getStatusText(company.tradeRegisterStatusLabel, company.tradeRegisterStatusCode);
  const previousLegalNames = company.previousLegalNames ?? [];
  const alternateNames = company.alternateNames ?? [];
  const previousNamePreview = previousLegalNames.slice(0, NAME_HISTORY_PREVIEW_LIMIT);
  const alternateNamePreview = alternateNames.slice(0, NAME_HISTORY_PREVIEW_LIMIT);
  const additionalNameCount =
    previousLegalNames.length - previousNamePreview.length + (alternateNames.length - alternateNamePreview.length);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Official Name" text={currentLegalName} />
      <List.Item.Detail.Metadata.Label title="Y-tunnus" text={company.businessId} />
      {company.website ? (
        <List.Item.Detail.Metadata.Link title="Website" target={company.website} text={company.website} />
      ) : (
        <List.Item.Detail.Metadata.Label title="Website" text="Not available" />
      )}
      {addressParts?.streetAddress ? (
        mapLinks ? (
          <List.Item.Detail.Metadata.Link
            title="Street Address"
            target={mapLinks.googleMaps}
            text={addressParts.streetAddress}
          />
        ) : (
          <List.Item.Detail.Metadata.Label title="Street Address" text={addressParts.streetAddress} />
        )
      ) : (
        <List.Item.Detail.Metadata.Label title="Street Address" text="Not available" />
      )}
      {addressParts?.postOfficeBox ? (
        <List.Item.Detail.Metadata.Label title="P.O. Box" text={addressParts.postOfficeBox} />
      ) : null}
      <List.Item.Detail.Metadata.Label title="Postal Code" text={addressParts?.postalCode ?? "Not available"} />
      <List.Item.Detail.Metadata.Label title="City" text={addressParts?.city ?? "Not available"} />
      {addressParts?.careOf ? <List.Item.Detail.Metadata.Label title="Care Of" text={addressParts.careOf} /> : null}
      {addressParts?.country ? <List.Item.Detail.Metadata.Label title="Country" text={addressParts.country} /> : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={businessStatus}
          color={company.businessIdStatusCode === "2" ? Color.Green : undefined}
        />
        <List.Item.Detail.Metadata.TagList.Item text={tradeStatus} />
      </List.Item.Detail.Metadata.TagList>
      {company.companyFormLabel ? (
        <List.Item.Detail.Metadata.Label title="Company Form" text={company.companyFormLabel} />
      ) : null}
      {company.mainBusinessLineLabel ? (
        <List.Item.Detail.Metadata.Label title="Main Business Line" text={company.mainBusinessLineLabel} />
      ) : null}
      <List.Item.Detail.Metadata.Label
        title="Active Register Entries"
        text={String(company.activeRegisterCount ?? 0)}
      />
      {currentLegalName.toLowerCase() !== company.displayName.toLowerCase() ? (
        <List.Item.Detail.Metadata.Label title="Current Legal Name" text={currentLegalName} />
      ) : null}
      {previousLegalNames.length > 0 || alternateNames.length > 0 ? (
        <>
          <List.Item.Detail.Metadata.Label
            title="Name History"
            text={getNameHistoryCount(previousLegalNames.length, alternateNames.length)}
          />
          {previousNamePreview.map((name, index) => (
            <List.Item.Detail.Metadata.Label
              key={`previous-${name}`}
              title={index === 0 ? "Previous Name" : `Previous Name ${index + 1}`}
              text={name}
            />
          ))}
          {alternateNamePreview.map((name, index) => (
            <List.Item.Detail.Metadata.Label
              key={`alternate-${name}`}
              title={index === 0 ? "Alternate Name" : `Alternate Name ${index + 1}`}
              text={name}
            />
          ))}
          {additionalNameCount > 0 ? (
            <List.Item.Detail.Metadata.Label title="More Names" text={`+${additionalNameCount} in View Details`} />
          ) : null}
        </>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      {company.euVatNumber ? (
        <List.Item.Detail.Metadata.Label title="EU VAT Number" text={company.euVatNumber} />
      ) : null}
      <List.Item.Detail.Metadata.Label title="Last Modified" text={lastModified} />
      <List.Item.Detail.Metadata.Label title="Registration Date" text={registrationDate} />
      <List.Item.Detail.Metadata.Label title="End Date" text={endDate} />
    </List.Item.Detail.Metadata>
  );
}
