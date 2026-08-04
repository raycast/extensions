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

  // Officers are bounded (almost always one or two pages), so we load the full
  // set up front. That lets Raycast filter by name across every officer rather
  // than just the page currently in view.
  const { isLoading, data } = useCachedPromise(
    async (company: string) => {
      const all: CompanyOfficer[] = [];
      let startIndex = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getCompanyOfficers(company, startIndex);
        const items = res.items ?? [];
        all.push(...items);
        const total = res.total_results ?? all.length;
        startIndex += items.length;
        if (items.length === 0 || all.length >= total) break;
      }
      return all;
    },
    [companyNumber],
  );

  const officers = (data ?? []).filter((officer) => {
    if (status === "active") return !officer.resigned_on;
    if (status === "resigned") return Boolean(officer.resigned_on);
    return true;
  });

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
          <List.Dropdown.Item title="All Officers" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Resigned" value="resigned" />
        </List.Dropdown>
      }
    >
      {officers.length ? (
        officers.map((officer, index) => (
          <OfficerItem key={`${officer.name}-${index}`} officer={officer} />
        ))
      ) : (
        <List.EmptyView title="No officers found" icon={Icon.PersonLines} />
      )}
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
          <Action.CopyToClipboard title="Copy Name" content={officer.name} />
        </ActionPanel>
      }
    />
  );
}
