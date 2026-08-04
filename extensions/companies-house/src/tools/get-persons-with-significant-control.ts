import { getPersonsWithSignificantControl } from "../api";
import {
  formatDate,
  formatDateOfBirth,
  pscKindLabel,
  pscNatureLabel,
} from "../helpers";

type Input = {
  /** The Companies House company number. */
  companyNumber: string;
};

/** List the persons with significant control (beneficial owners) of a company, including their nature of control (e.g. share ownership or voting rights). */
export default async function tool(input: Input) {
  const res = await getPersonsWithSignificantControl(input.companyNumber, 0);
  return (res.items ?? []).map((psc) => ({
    name: psc.name,
    kind: pscKindLabel(psc.kind),
    status: psc.ceased_on ? "Ceased" : "Active",
    natures_of_control: (psc.natures_of_control ?? []).map(pscNatureLabel),
    notified: formatDate(psc.notified_on),
    nationality: psc.nationality,
    born: formatDateOfBirth(psc.date_of_birth),
  }));
}
