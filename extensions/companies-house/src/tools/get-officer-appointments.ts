import { getOfficerAppointments } from "../api";
import { companyStatusLabel, formatDate, officerRoleLabel } from "../helpers";
import type { AppointmentItem } from "../types";

/**
 * Enough pages to cover any officer a caller is realistically asking about,
 * without letting a company-formation agent with thousands of appointments
 * spend the whole rate limit on one question.
 */
const MAX_PAGES = 10;

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
  const items: AppointmentItem[] = [];
  let name: string | undefined;
  let total: number | undefined;
  let startIndex = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await getOfficerAppointments(input.officerId, startIndex);
    if (page === 0) name = res.name;
    const pageItems = res.items ?? [];
    items.push(...pageItems);
    total ??= res.total_results;
    startIndex += pageItems.length;
    if (pageItems.length === 0 || items.length >= (total ?? items.length))
      break;
  }

  const complete = items.length >= (total ?? items.length);

  return {
    name,
    // The register's own total. A single request returns 20, so counting the
    // list below would understate an officer with more appointments than that.
    total: total ?? items.length,
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
