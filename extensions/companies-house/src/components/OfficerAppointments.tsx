import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getOfficerAppointments } from "../api";
import {
  companyStatusLabel,
  companyWebUrl,
  formatAddress,
  formatDate,
  formatDateOfBirth,
  officerRoleLabel,
  statusColor,
} from "../helpers";
import { fetchAllPages } from "../pagination";
import type { AppointmentItem, AppointmentsResponse } from "../types";

import { CompanyProfile } from "./CompanyProfile";
import { Disqualifications } from "./Disqualifications";

export function OfficerAppointments({
  officerId,
  officerName,
}: {
  officerId: string;
  officerName?: string;
}) {
  const { isLoading, data } = useCachedPromise(
    async (id: string) => {
      const { items, total, complete, firstPage } = await fetchAllPages<
        AppointmentItem,
        AppointmentsResponse
      >((startIndex) => getOfficerAppointments(id, startIndex));

      return {
        name: firstPage?.name,
        dateOfBirth: firstPage?.date_of_birth,
        items,
        total,
        complete,
      };
    },
    [officerId],
  );

  const born = formatDateOfBirth(data?.dateOfBirth);
  const appointments = data?.items ?? [];
  const truncated = data ? !data.complete : false;
  const name = data?.name ?? officerName;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering
      navigationTitle={name ?? "Appointments"}
      searchBarPlaceholder="Filter appointments by company…"
    >
      {truncated ? (
        <List.Section
          title={`Showing the first ${appointments.length} of ${data?.total} appointments`}
        >
          {appointments.map((appointment, index) => (
            <AppointmentRow
              key={`${appointment.appointed_to?.company_number ?? index}`}
              appointment={appointment}
              born={born}
              officerName={name}
            />
          ))}
        </List.Section>
      ) : (
        appointments.map((appointment, index) => (
          <AppointmentRow
            key={`${appointment.appointed_to?.company_number ?? index}`}
            appointment={appointment}
            born={born}
            officerName={name}
          />
        ))
      )}
      <List.EmptyView
        title="No Appointments Found"
        description="Companies House lists no company appointments for this officer id."
        icon={Icon.Building}
      />
    </List>
  );
}

function AppointmentRow({
  appointment,
  born,
  officerName,
}: {
  appointment: AppointmentItem;
  born?: string;
  officerName?: string;
}) {
  const company = appointment.appointed_to;
  const status = company?.company_status;
  const resigned = Boolean(appointment.resigned_on);
  const address = formatAddress(appointment.address);

  return (
    <List.Item
      title={company?.company_name ?? "Unknown company"}
      subtitle={officerRoleLabel(appointment.officer_role)}
      accessories={[
        {
          icon: resigned
            ? { source: Icon.XMarkCircle, tintColor: Color.SecondaryText }
            : { source: Icon.CheckCircle, tintColor: Color.Green },
          tooltip: resigned ? "Resigned" : "Active appointment",
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {company?.company_name ? (
                <List.Item.Detail.Metadata.Label
                  title="Company"
                  text={company.company_name}
                />
              ) : null}
              {status ? (
                <List.Item.Detail.Metadata.TagList title="Company Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={companyStatusLabel(status) ?? status}
                    color={statusColor(status)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {appointment.officer_role ? (
                <List.Item.Detail.Metadata.Label
                  title="Role"
                  text={officerRoleLabel(appointment.officer_role)}
                />
              ) : null}
              {appointment.appointed_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Appointed"
                  text={formatDate(appointment.appointed_on)}
                />
              ) : null}
              {appointment.resigned_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Resigned"
                  text={formatDate(appointment.resigned_on)}
                />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              {born ? (
                <List.Item.Detail.Metadata.Label
                  title="Date of Birth"
                  text={born}
                />
              ) : null}
              {appointment.nationality ? (
                <List.Item.Detail.Metadata.Label
                  title="Nationality"
                  text={appointment.nationality}
                />
              ) : null}
              {appointment.occupation ? (
                <List.Item.Detail.Metadata.Label
                  title="Occupation"
                  text={appointment.occupation}
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
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {officerName ? (
            <ActionPanel.Section title="Officer">
              <Action.Push
                title="Search Disqualified Directors Register"
                icon={Icon.ExclamationMark}
                target={<Disqualifications officerName={officerName} />}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
