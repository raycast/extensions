import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";

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
import { recordViewedCompany } from "../recently-viewed";
import { officerStanding, type OfficerCounts } from "../officer-standing";
import type {
  CompanyProfile as CompanyProfileData,
  CompanySearchItem,
} from "../types";

import { Charges } from "./Charges";
import { CompanyOfficers } from "./CompanyOfficers";
import { FilingHistory } from "./FilingHistory";
import { Insolvency } from "./Insolvency";
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

  // Recorded once the profile has a name to record. Writing on mount would put
  // a bare company number into the recent list for anyone who opened a company
  // straight from a URL or a tool result.
  const resolvedName = company?.company_name ?? name;
  const resolvedStatus = company?.company_status;
  useEffect(() => {
    if (!resolvedName) return;
    recordViewedCompany({
      companyNumber,
      name: resolvedName,
      status: resolvedStatus,
    }).catch((error: unknown) =>
      showFailureToast(error, { title: "Could Not Record Recently Viewed" }),
    );
  }, [companyNumber, resolvedName, resolvedStatus]);

  let markdown = `# ${title}`;
  const statusDetail = companyStatusDetailLabel(company?.company_status_detail);
  if (statusDetail) {
    markdown += `\n\n> ${statusDetail}`;
  }

  // Not `!resigned_on`: the members of a dissolved company never resigned, so
  // they carry no resignation date while the register counts them as inactive.
  // Reading the absence of a date as "in post" lists a dissolved company's
  // former members as its current ones.
  const officerCounts: OfficerCounts = {
    activeCount: officers?.active_count,
    inactiveCount: officers?.inactive_count,
  };
  const activeOfficers = (officers?.items ?? []).filter(
    (officer) => officerStanding(officer, officerCounts) === "active",
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

  // `accounts.next_due` and `accounts.overdue` are deprecated in favour of the
  // `next_accounts` block; fall back to them only for records the API has not
  // migrated.
  const accountsDue = formatDate(
    company?.accounts?.next_accounts?.due_on ?? company?.accounts?.next_due,
  );
  const accountsOverdue =
    company?.accounts?.next_accounts?.overdue ?? company?.accounts?.overdue;
  const confirmationDue = formatDate(company?.confirmation_statement?.next_due);
  const previousNames = company?.previous_company_names ?? [];
  const registeredOffice = formatAddress(company?.registered_office_address);

  // `has_charges` and `has_insolvency_history` mean "has or had": a company
  // that satisfied every charge years ago still reports true. The `links` block
  // is only present when there is a live sub-resource to read, so it answers
  // the question a reader is actually asking.
  const hasCharges = Boolean(company?.links?.charges);
  const hasInsolvency = Boolean(company?.links?.insolvency);

  // A company that is exempt from the PSC requirements, or that filed a
  // statement instead of an entry, has no `persons_with_significant_control`
  // link at all — HSBC Holdings has only `exemptions`. Gating the drill-down on
  // that one link hid the ownership view from exactly the companies whose
  // empty register most needs explaining, so any of the three counts.
  const hasPscRecord = Boolean(
    company?.links?.persons_with_significant_control ??
    company?.links?.persons_with_significant_control_statements ??
    company?.links?.exemptions,
  );

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
          {registeredOffice ? (
            <Detail.Metadata.Label
              title="Registered Office"
              text={registeredOffice}
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
              text={accountsOverdue ? `${accountsDue} (overdue)` : accountsDue}
              icon={
                accountsOverdue
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

          {hasCharges || hasInsolvency ? <Detail.Metadata.Separator /> : null}
          {hasCharges ? (
            <Detail.Metadata.Label title="Charges" text="On the register" />
          ) : null}
          {hasInsolvency ? (
            <Detail.Metadata.Label
              title="Insolvency"
              text="Record on the register"
            />
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
            {hasCharges ? (
              <Action.Push
                title="View Charges"
                icon={Icon.Coins}
                target={
                  <Charges companyNumber={companyNumber} companyName={title} />
                }
              />
            ) : null}
            {hasInsolvency ? (
              <Action.Push
                title="View Insolvency"
                icon={Icon.Hammer}
                target={
                  <Insolvency
                    companyNumber={companyNumber}
                    companyName={title}
                  />
                }
              />
            ) : null}
            {hasPscRecord ? (
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
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
