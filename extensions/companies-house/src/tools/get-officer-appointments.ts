import { getOfficerAppointments } from "../api";
import { companyStatusLabel, formatDate, officerRoleLabel } from "../helpers";

type Input = {
  /** The officer id (obtained from search-officers), used to list all of an officer's appointments. */
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
