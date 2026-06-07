import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getCompany, getCompanyOfficers } from "../api";
import {
  companyStatusDetailLabel,
  companyStatusLabel,
  companyTypeLabel,
  companyWebUrl,
  formatAddress,
  formatDate,
  jurisdictionLabel,
  officerRoleLabel,
  sicCodeLabel,
  statusColor,
} from "../helpers";
import type {
  CompanyProfile as CompanyProfileData,
  CompanySearchItem,
} from "../types";

import { Charges } from "./Charges";
import { CompanyOfficers } from "./CompanyOfficers";
import { FilingHistory } from "./FilingHistory";
import { PersonsWithSignificantControl } from "./PersonsWithSignificantControl";

const OFFICERS_IN_SUMMARY = 10;

function initialFromSearch(
  item?: CompanySearchItem,
): CompanyProfileData | undefined {
  if (!item) return undefined;
  return {
    company_number: item.company_number,
    company_name: item.title,
    company_status: item.company_status,
    type: item.company_type,
    date_of_creation: item.date_of_creation,
    date_of_cessation: item.date_of_cessation,
  };
}

export function CompanyProfile({
  companyNumber,
  name,
  initial,
}: {
  companyNumber: string;
  name?: string;
  initial?: CompanySearchItem;
}) {
  const { isLoading, data: company } = useCachedPromise(
    getCompany,
    [companyNumber],
    {
      initialData: initialFromSearch(initial),
    },
  );
  const { data: officers } = useCachedPromise(getCompanyOfficers, [
    companyNumber,
    0,
  ]);

  const title = company?.company_name ?? name ?? companyNumber;

  let markdown = `# ${title}`;
  const statusDetail = companyStatusDetailLabel(company?.company_status_detail);
  if (statusDetail) {
    markdown += `\n\n> ${statusDetail}`;
  }

  const activeOfficers = (officers?.items ?? []).filter(
    (officer) => !officer.resigned_on,
  );
  if (activeOfficers.length) {
    const escapeCell = (value: string) => value.replace(/\|/g, "\\|");
    const shown = Math.min(activeOfficers.length, OFFICERS_IN_SUMMARY);
    markdown += "\n\n| Officer | Role |\n| --- | --- |\n";
    markdown += activeOfficers
      .slice(0, OFFICERS_IN_SUMMARY)
      .map(
        (officer) =>
          `| ${escapeCell(officer.name)} | ${escapeCell(officerRoleLabel(officer.officer_role) ?? "—")} |`,
      )
      .join("\n");
    const activeCount = officers?.active_count ?? activeOfficers.length;
    if (activeCount > shown) {
      markdown += `\n\n_Showing ${shown} of ${activeCount}. Use “View Officers” to see all and filter._`;
    }
  }

  const accountsDue = formatDate(company?.accounts?.next_due);
  const confirmationDue = formatDate(company?.confirmation_statement?.next_due);
  const previousNames = company?.previous_company_names ?? [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Company Number" text={companyNumber} />

          {company?.company_status ? (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={
                  companyStatusLabel(company.company_status) ??
                  company.company_status
                }
                color={statusColor(company.company_status)}
              />
            </Detail.Metadata.TagList>
          ) : null}

          {company?.type ? (
            <Detail.Metadata.Label
              title="Type"
              text={companyTypeLabel(company.type)}
            />
          ) : null}
          {company?.date_of_creation ? (
            <Detail.Metadata.Label
              title="Incorporated"
              text={formatDate(company.date_of_creation)}
            />
          ) : null}
          {company?.date_of_cessation ? (
            <Detail.Metadata.Label
              title="Dissolved"
              text={formatDate(company.date_of_cessation)}
            />
          ) : null}
          {company?.jurisdiction ? (
            <Detail.Metadata.Label
              title="Jurisdiction"
              text={jurisdictionLabel(company.jurisdiction)}
            />
          ) : null}
          {formatAddress(company?.registered_office_address) ? (
            <Detail.Metadata.Label
              title="Registered Office"
              text={formatAddress(company?.registered_office_address)}
            />
          ) : null}

          {company?.sic_codes?.length ? (
            <Detail.Metadata.TagList title="Nature of Business (SIC)">
              {company.sic_codes.map((code) => (
                <Detail.Metadata.TagList.Item
                  key={code}
                  text={sicCodeLabel(code)}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}

          {accountsDue || confirmationDue ? (
            <Detail.Metadata.Separator />
          ) : null}
          {accountsDue ? (
            <Detail.Metadata.Label
              title="Accounts Due"
              text={
                company?.accounts?.overdue
                  ? `${accountsDue} (overdue)`
                  : accountsDue
              }
              icon={
                company?.accounts?.overdue
                  ? { source: Icon.Warning, tintColor: Color.Red }
                  : undefined
              }
            />
          ) : null}
          {confirmationDue ? (
            <Detail.Metadata.Label
              title="Confirmation Statement Due"
              text={
                company?.confirmation_statement?.overdue
                  ? `${confirmationDue} (overdue)`
                  : confirmationDue
              }
              icon={
                company?.confirmation_statement?.overdue
                  ? { source: Icon.Warning, tintColor: Color.Red }
                  : undefined
              }
            />
          ) : null}

          {company?.has_charges || company?.has_insolvency_history ? (
            <Detail.Metadata.Separator />
          ) : null}
          {company?.has_charges ? (
            <Detail.Metadata.Label title="Charges" text="Yes" />
          ) : null}
          {company?.has_insolvency_history ? (
            <Detail.Metadata.Label title="Insolvency History" text="Yes" />
          ) : null}

          {previousNames.length ? <Detail.Metadata.Separator /> : null}
          {previousNames.map((previous, index) => (
            <Detail.Metadata.Label
              key={`${previous.name}-${index}`}
              title={index === 0 ? "Previous Names" : ""}
              text={`${previous.name}${previous.ceased_on ? ` (to ${formatDate(previous.ceased_on)})` : ""}`}
            />
          ))}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Companies House"
            target={companyWebUrl(companyNumber)}
            text="View on Companies House"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={companyWebUrl(companyNumber)}
          />
          <ActionPanel.Section>
            <Action.Push
              title="View Officers"
              icon={Icon.PersonLines}
              target={
                <CompanyOfficers
                  companyNumber={companyNumber}
                  companyName={title}
                />
              }
            />
            <Action.Push
              title="View Filing History"
              icon={Icon.Document}
              target={
                <FilingHistory
                  companyNumber={companyNumber}
                  companyName={title}
                />
              }
            />
            {company?.has_charges ? (
              <Action.Push
                title="View Charges"
                icon={Icon.Coins}
                target={
                  <Charges companyNumber={companyNumber} companyName={title} />
                }
              />
            ) : null}
            {company?.links?.persons_with_significant_control ? (
              <Action.Push
                title="View Persons with Significant Control"
                icon={Icon.PersonCircle}
                target={
                  <PersonsWithSignificantControl
                    companyNumber={companyNumber}
                    companyName={title}
                  />
                }
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Company Number"
              content={companyNumber}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
