import { Color, List } from "@raycast/api";
import { formatDate } from "./format";
import { buildMapSearchLinks } from "./maps";
import { getPrimaryAddressText } from "./selectors";
import type { UiCompany } from "../types/ui";

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

function buildNamePreview(names: string[], limit: number): string {
  if (!names.length) {
    return "None";
  }

  const preview = names.slice(0, limit).join(", ");
  if (names.length <= limit) {
    return preview;
  }

  return `${preview}, +${names.length - limit} more`;
}

export function buildSplitDetailMarkdown(company: UiCompany): string {
  return `# ${company.displayName}`;
}

export function buildSplitDetailMetadata(company: UiCompany): JSX.Element {
  const primaryAddress = getPrimaryAddressText(company);
  const mapLinks = buildMapSearchLinks(company.displayName, primaryAddress);
  const registrationDate = formatDate(company.registrationDate) ?? "Not available";
  const endDate = formatDate(company.endDate) ?? "Not available";
  const lastModified = formatDate(company.lastModified) ?? company.lastModified ?? "Not available";
  const currentLegalName = company.currentLegalName ?? company.displayName;
  const businessStatus = getStatusText(company.businessIdStatusLabel, company.businessIdStatusCode);
  const tradeStatus = getStatusText(company.tradeRegisterStatusLabel, company.tradeRegisterStatusCode);
  const previousLegalNames = company.previousLegalNames ?? [];
  const alternateNames = company.alternateNames ?? [];

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Official Name" text={currentLegalName} />
      <List.Item.Detail.Metadata.Label title="Y-tunnus" text={company.businessId} />
      {company.website ? (
        <List.Item.Detail.Metadata.Link title="Website" target={company.website} text={company.website} />
      ) : (
        <List.Item.Detail.Metadata.Label title="Website" text="Not available" />
      )}
      {primaryAddress ? (
        mapLinks ? (
          <List.Item.Detail.Metadata.Link title="Address" target={mapLinks.googleMaps} text={primaryAddress} />
        ) : (
          <List.Item.Detail.Metadata.Label title="Address" text={primaryAddress} />
        )
      ) : (
        <List.Item.Detail.Metadata.Label title="Address" text="Not available" />
      )}
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
      {(company.previousLegalNameCount ?? 0) > 0 || (company.alternateNameCount ?? 0) > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Name History">
          {(company.previousLegalNameCount ?? 0) > 0 ? (
            <List.Item.Detail.Metadata.TagList.Item
              text={`Previous ${buildNamePreview(previousLegalNames, 2)}`}
              color={Color.SecondaryText}
            />
          ) : null}
          {(company.alternateNameCount ?? 0) > 0 ? (
            <List.Item.Detail.Metadata.TagList.Item
              text={`Alternate ${buildNamePreview(alternateNames, 2)}`}
              color={Color.SecondaryText}
            />
          ) : null}
        </List.Item.Detail.Metadata.TagList>
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
