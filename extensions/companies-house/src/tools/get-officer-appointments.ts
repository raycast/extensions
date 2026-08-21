import { getOfficerAppointments } from "../api";
import { companyStatusLabel, formatDate, officerRoleLabel } from "../helpers";
import { fetchAllPages } from "../pagination";
import type { AppointmentItem, AppointmentsResponse } from "../types";

type Input = {
  /**
   * The officer id, e.g. "i01-NvuSb_IXaHc1mrh6CAmvi48". Both search-officers
   * and get-officers return one for every officer they list; take it from
   * there rather than constructing it. It is not the officer's name and not
   * the company number.
   */
  officerId: string;
};

/** List every company appointment for an officer across all companies, by officer id. Useful for seeing what else a director is involved in. Reports whether every appointment was read, so a long list is never presented as a complete one. */
export default async function tool(input: Input) {
  const { items, total, complete, firstPage } = await fetchAllPages<
    AppointmentItem,
    AppointmentsResponse
  >((startIndex) => getOfficerAppointments(input.officerId, startIndex));

  return {
    name: firstPage?.name,
    // The register's own total. A single request returns 20, so counting the
    // list below would understate an officer with more appointments than that.
    total,
    returned: items.length,
    complete,
    ...(complete
      ? {}
      : {
          note: `Only the first ${items.length} of ${total} appointments were read. Do not describe this as the officer's full record.`,
        }),
    appointments: items.map((appointment) => ({
      company: appointment.appointed_to?.company_name,
      company_number: appointment.appointed_to?.company_number,
      company_status: companyStatusLabel(
        appointment.appointed_to?.company_status,
      ),
      role: officerRoleLabel(appointment.officer_role),
      appointed: formatDate(appointment.appointed_on),
      resigned: formatDate(appointment.resigned_on),
    })),
  };
}
