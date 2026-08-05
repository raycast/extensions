import { getCompanyOfficers } from "../api";
import { formatDate, formatDateOfBirth, officerRoleLabel } from "../helpers";
import { officerStanding, standingLabel } from "../officer-standing";

type Input = {
  /** The Companies House company number. */
  companyNumber: string;
};

/** List the officers of a company (directors, secretaries, LLP members), including their role, appointment and resignation dates. */
export default async function tool(input: Input) {
  const res = await getCompanyOfficers(input.companyNumber, 0);
  const counts = {
    activeCount: res.active_count,
    inactiveCount: res.inactive_count,
  };
  return {
    // The register's own totals. The list below is one page, so counting it
    // would understate a company with more officers than fit on a page.
    total: res.total_results,
    active_count: res.active_count,
    resigned_count: res.resigned_count,
    inactive_count: res.inactive_count,
    returned: res.items?.length ?? 0,
    officers: (res.items ?? []).map((officer) => ({
      name: officer.name,
      role: officerRoleLabel(officer.officer_role),
      status: standingLabel(officerStanding(officer, counts)),
      appointed: formatDate(officer.appointed_on),
      resigned: formatDate(officer.resigned_on),
      born: formatDateOfBirth(officer.date_of_birth),
      nationality: officer.nationality,
    })),
  };
}
