import { getCompanyOfficers } from "../api";
import { formatDate, formatDateOfBirth, officerRoleLabel } from "../helpers";

type Input = {
  /** The Companies House company number. */
  companyNumber: string;
};

/** List the officers of a company (directors, secretaries, LLP members), including their role, appointment and resignation dates. */
export default async function tool(input: Input) {
  const res = await getCompanyOfficers(input.companyNumber, 0);
  return (res.items ?? []).map((officer) => ({
    name: officer.name,
    role: officerRoleLabel(officer.officer_role),
    status: officer.resigned_on ? "Resigned" : "Active",
    appointed: formatDate(officer.appointed_on),
    resigned: formatDate(officer.resigned_on),
    born: formatDateOfBirth(officer.date_of_birth),
    nationality: officer.nationality,
  }));
}
