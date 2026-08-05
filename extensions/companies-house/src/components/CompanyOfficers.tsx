import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
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
import type { CompanyOfficer } from "../types";

import { Disqualifications } from "./Disqualifications";
import { OfficerAppointments } from "./OfficerAppointments";

const MAX_PAGES = 10;

type StatusFilter = "all" | "active" | "resigned";

export function CompanyOfficers({
  companyNumber,
  companyName,
}: {
  companyNumber: string;
  companyName?: string;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  // Officers are loaded in full rather than page by page, so that Raycast's
  // search filters across every officer instead of only the page in view. The
  // page budget exists to stop a company with thousands of historic officers
  // hanging the command, so the result reports whether it was hit — a
  // truncated list that says nothing is indistinguishable from a complete one.
  const { isLoading, data } = useCachedPromise(
    async (company: string) => {
      const all: CompanyOfficer[] = [];
      let startIndex = 0;
      let total: number | undefined;
      let activeCount: number | undefined;
      let resignedCount: number | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getCompanyOfficers(company, startIndex);
        const items = res.items ?? [];
        all.push(...items);
        total ??= res.total_results;
        activeCount ??= res.active_count;
        resignedCount ??= res.resigned_count;
        startIndex += items.length;
        if (items.length === 0 || all.length >= (total ?? all.length)) break;
      }

      return {
        officers: all,
        // The API's own totals, not the length of what we managed to read.
        total: total ?? all.length,
        activeCount,
        resignedCount,
        complete: all.length >= (total ?? all.length),
      };
    },
    [companyNumber],
  );

  const officers = (data?.officers ?? []).filter((officer) => {
    if (status === "active") return !officer.resigned_on;
    if (status === "resigned") return Boolean(officer.resigned_on);
    return true;
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
        </List.Dropdown>
      }
    >
      {truncated ? (
        <List.Section
          title={`Showing the first ${officers.length} of ${data?.total} officers`}
        >
          {officers.map((officer, index) => (
            <OfficerItem key={`${officer.name}-${index}`} officer={officer} />
          ))}
        </List.Section>
      ) : (
        officers.map((officer, index) => (
          <OfficerItem key={`${officer.name}-${index}`} officer={officer} />
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

function OfficerItem({ officer }: { officer: CompanyOfficer }) {
  const resigned = Boolean(officer.resigned_on);
  const officerId = extractOfficerId(officer.links?.officer?.appointments);
  const dob = formatDateOfBirth(officer.date_of_birth);
  const address = formatAddress(officer.address);

  return (
    <List.Item
      title={officer.name}
      subtitle={officerRoleLabel(officer.officer_role)}
      accessories={[
        {
          icon: resigned
            ? { source: Icon.XMarkCircle, tintColor: Color.SecondaryText }
            : { source: Icon.CheckCircle, tintColor: Color.Green },
          tooltip: resigned ? "Resigned" : "Active",
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
                  text={resigned ? "Resigned" : "Active"}
                  color={resigned ? Color.SecondaryText : Color.Green}
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
          <Action.CopyToClipboard title="Copy Name" content={officer.name} />
        </ActionPanel>
      }
    />
  );
}
