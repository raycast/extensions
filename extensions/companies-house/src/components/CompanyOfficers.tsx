import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getCompanyOfficers } from "../api";
import {
  extractOfficerId,
  formatAddress,
  formatDate,
  formatDateOfBirth,
  officerRoleLabel,
  officerWebUrl,
} from "../helpers";
import {
  officerStanding,
  standingColor,
  standingIcon,
  standingLabel,
  type OfficerCounts,
} from "../officer-standing";
import { fetchAllPages } from "../pagination";
import type {
  CompanyOfficer,
  CompanyOfficersResponse,
  CompanyViewProps,
} from "../types";

import { Disqualifications } from "./Disqualifications";
import { OfficerAppointments } from "./OfficerAppointments";

type StatusFilter = "all" | "active" | "resigned" | "inactive";

export function CompanyOfficers({
  companyNumber,
  companyName,
}: CompanyViewProps) {
  const [status, setStatus] = useState<StatusFilter>("all");

  // Officers are loaded in full rather than page by page, so that Raycast's
  // search filters across every officer instead of only the page in view. The
  // page budget exists to stop a company with thousands of historic officers
  // hanging the command, so the result reports whether it was hit — a
  // truncated list that says nothing is indistinguishable from a complete one.
  const { isLoading, data } = useCachedPromise(
    async (company: string) => {
      const { items, total, complete, firstPage } = await fetchAllPages<
        CompanyOfficer,
        CompanyOfficersResponse
      >((startIndex) => getCompanyOfficers(company, startIndex));

      return {
        officers: items,
        // The API's own totals, not the length of what we managed to read.
        total,
        activeCount: firstPage?.active_count,
        inactiveCount: firstPage?.inactive_count,
        resignedCount: firstPage?.resigned_count,
        complete,
      };
    },
    [companyNumber],
  );

  const counts: OfficerCounts = {
    activeCount: data?.activeCount,
    inactiveCount: data?.inactiveCount,
  };

  const officers = (data?.officers ?? []).filter((officer) => {
    if (status === "all") return true;
    return status === officerStanding(officer, counts);
  });

  const truncated = data ? !data.complete : false;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering
      navigationTitle={companyName ? `${companyName} — Officers` : "Officers"}
      searchBarPlaceholder="Filter officers by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        >
          <List.Dropdown.Item
            title={
              data?.total ? `All Officers (${data.total})` : "All Officers"
            }
            value="all"
          />
          <List.Dropdown.Item
            title={
              data?.activeCount === undefined
                ? "Active"
                : `Active (${data.activeCount})`
            }
            value="active"
          />
          <List.Dropdown.Item
            title={
              data?.resignedCount === undefined
                ? "Resigned"
                : `Resigned (${data.resignedCount})`
            }
            value="resigned"
          />
          {data?.inactiveCount ? (
            <List.Dropdown.Item
              title={`No Longer in Post (${data.inactiveCount})`}
              value="inactive"
            />
          ) : null}
        </List.Dropdown>
      }
    >
      {truncated ? (
        <List.Section
          title={`Showing the first ${officers.length} of ${data?.total} officers`}
        >
          {officers.map((officer, index) => (
            <OfficerItem
              key={`${officer.name}-${index}`}
              officer={officer}
              counts={counts}
            />
          ))}
        </List.Section>
      ) : (
        officers.map((officer, index) => (
          <OfficerItem
            key={`${officer.name}-${index}`}
            officer={officer}
            counts={counts}
          />
        ))
      )}
      <List.EmptyView
        title="No Officers Found"
        description={
          status === "all"
            ? "Companies House lists no officers for this company."
            : "No officers match this filter."
        }
        icon={Icon.PersonLines}
      />
    </List>
  );
}

function OfficerItem({
  officer,
  counts,
}: {
  officer: CompanyOfficer;
  counts: OfficerCounts;
}) {
  const standing = officerStanding(officer, counts);
  const label = standingLabel(standing);
  const officerId = extractOfficerId(officer.links?.officer?.appointments);
  const dob = formatDateOfBirth(officer.date_of_birth);
  const address = formatAddress(officer.address);

  return (
    <List.Item
      title={officer.name}
      subtitle={officerRoleLabel(officer.officer_role)}
      accessories={[
        {
          icon: {
            source: standingIcon(standing),
            tintColor: standingColor(standing),
          },
          tooltip: label,
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={officer.name}
              />
              {officer.officer_role ? (
                <List.Item.Detail.Metadata.Label
                  title="Role"
                  text={officerRoleLabel(officer.officer_role)}
                />
              ) : null}
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={label}
                  color={standingColor(standing)}
                />
              </List.Item.Detail.Metadata.TagList>
              {officer.appointed_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Appointed"
                  text={formatDate(officer.appointed_on)}
                />
              ) : null}
              {officer.resigned_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Resigned"
                  text={formatDate(officer.resigned_on)}
                />
              ) : null}
              {dob ? (
                <List.Item.Detail.Metadata.Label title="Born" text={dob} />
              ) : null}
              {officer.nationality ? (
                <List.Item.Detail.Metadata.Label
                  title="Nationality"
                  text={officer.nationality}
                />
              ) : null}
              {officer.occupation ? (
                <List.Item.Detail.Metadata.Label
                  title="Occupation"
                  text={officer.occupation}
                />
              ) : null}
              {officer.country_of_residence ? (
                <List.Item.Detail.Metadata.Label
                  title="Country of Residence"
                  text={officer.country_of_residence}
                />
              ) : null}
              {address ? (
                <List.Item.Detail.Metadata.Label
                  title="Correspondence Address"
                  text={address}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {officerId ? (
            <Action.Push
              title="View Appointments"
              icon={Icon.Building}
              target={
                <OfficerAppointments
                  officerId={officerId}
                  officerName={officer.name}
                />
              }
            />
          ) : null}
          {officerId ? (
            <Action.OpenInBrowser
              title="Open on Companies House"
              url={officerWebUrl(officerId)}
            />
          ) : null}
          <Action.Push
            title="Search Disqualified Directors Register"
            icon={Icon.ExclamationMark}
            target={<Disqualifications officerName={officer.name} />}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={officer.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}
