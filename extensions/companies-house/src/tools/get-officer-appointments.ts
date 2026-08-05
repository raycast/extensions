import { getOfficerAppointments } from "../api";
import { companyStatusLabel, formatDate, officerRoleLabel } from "../helpers";

type Input = {
  /**
   * The officer id, e.g. "i01-NvuSb_IXaHc1mrh6CAmvi48". Both search-officers
   * and get-officers return one for every officer they list; take it from
   * there rather than constructing it. It is not the officer's name and not
   * the company number.
   */
  officerId: string;
};

/** List every company appointment for an officer across all companies, by officer id. Useful for seeing what else a director is involved in. */
export default async function tool(input: Input) {
  const res = await getOfficerAppointments(input.officerId, 0);
  return {
    name: res.name,
    total: res.total_results,
    appointments: (res.items ?? []).map((appointment) => ({
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
