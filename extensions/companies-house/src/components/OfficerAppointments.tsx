import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getOfficerAppointments } from "../api";
import { PAGE_SIZE } from "../constants";
import {
  companyStatusLabel,
  companyWebUrl,
  formatDate,
  officerRoleLabel,
  statusColor,
} from "../helpers";
import type { AppointmentItem } from "../types";

import { CompanyProfile } from "./CompanyProfile";

export function OfficerAppointments({
  officerId,
  officerName,
}: {
  officerId: string;
  officerName?: string;
}) {
  const { isLoading, data, pagination } = useCachedPromise(
    (id: string) => async (options: { page: number }) => {
      const startIndex = options.page * PAGE_SIZE;
      const res = await getOfficerAppointments(id, startIndex);
      const items = res.items ?? [];
      const total = res.total_results ?? items.length;
      return { data: items, hasMore: startIndex + items.length < total };
    },
    [officerId],
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={
        officerName ? `${officerName} · Appointments` : "Appointments"
      }
      searchBarPlaceholder="Filter appointments…"
    >
      {data?.length ? (
        data.map((appointment, index) => (
          <AppointmentRow
            key={`${appointment.appointed_to?.company_number ?? index}`}
            appointment={appointment}
          />
        ))
      ) : (
        <List.EmptyView title="No appointments found" icon={Icon.Building} />
      )}
    </List>
  );
}

function AppointmentRow({ appointment }: { appointment: AppointmentItem }) {
  const company = appointment.appointed_to;
  const status = company?.company_status;
  const resigned = Boolean(appointment.resigned_on);

  const accessories: List.Item.Accessory[] = [];
  if (status) {
    accessories.push({
      tag: {
        value: companyStatusLabel(status) ?? status,
        color: statusColor(status),
      },
    });
  }
  accessories.push({
    text: resigned
      ? `${formatDate(appointment.appointed_on) ?? "?"} – ${formatDate(appointment.resigned_on)}`
      : (formatDate(appointment.appointed_on) ?? ""),
    tooltip: resigned ? "Appointed – Resigned" : "Appointed",
  });

  return (
    <List.Item
      title={company?.company_name ?? "Unknown company"}
      subtitle={officerRoleLabel(appointment.officer_role)}
      accessories={accessories}
      actions={
        <ActionPanel>
          {company?.company_number ? (
            <Action.Push
              title="View Company"
              icon={Icon.Building}
              target={
                <CompanyProfile
                  companyNumber={company.company_number}
                  name={company.company_name}
                />
              }
            />
          ) : null}
          {company?.company_number ? (
            <Action.OpenInBrowser
              title="Open on Companies House"
              url={companyWebUrl(company.company_number)}
            />
          ) : null}
          {company?.company_number ? (
            <Action.CopyToClipboard
              title="Copy Company Number"
              content={company.company_number}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
