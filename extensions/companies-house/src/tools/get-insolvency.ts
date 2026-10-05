import { getInsolvency } from "../api";
import {
  companyStatusLabel,
  formatAddress,
  formatDate,
  insolvencyCaseTypeLabel,
  insolvencyDateTypeLabel,
} from "../helpers";

type Input = {
  /**
   * The Companies House company number, e.g. "03782379" or "OC394454". Eight
   * characters: eight digits, or two letters followed by six digits. Call
   * search-companies first when you only have a company name.
   */
  companyNumber: string;
};

/** Read the insolvency record for a company: each case's type, its key dates, the appointed insolvency practitioners and any notes. Companies House holds no insolvency record at all for a company that has never been subject to proceedings, which is reported as an absence rather than an error. */
export default async function tool(input: Input) {
  const res = await getInsolvency(input.companyNumber);

  // A company with no insolvency history 404s, which the API layer turns into
  // `undefined`. Saying so plainly stops the model reporting an absence as a
  // lookup failure.
  if (!res || !res.cases?.length) {
    return {
      cases: [],
      note: "Companies House holds no insolvency record for this company.",
    };
  }

  return {
    proceedings_in_force: (res.status ?? []).map(
      (status) => companyStatusLabel(status) ?? status,
    ),
    cases: res.cases.map((insolvencyCase) => ({
      case_number:
        insolvencyCase.number === undefined
          ? undefined
          : String(insolvencyCase.number),
      type: insolvencyCaseTypeLabel(insolvencyCase.type),
      dates: (insolvencyCase.dates ?? []).map((entry) => ({
        event: insolvencyDateTypeLabel(entry.type),
        date: formatDate(entry.date),
      })),
      practitioners: (insolvencyCase.practitioners ?? []).map(
        (practitioner) => ({
          name: practitioner.name,
          role: practitioner.role,
          appointed: formatDate(practitioner.appointed_on),
          // A practitioner who has ceased to act stays on the case, so this
          // has to be reported before anyone is described as handling it.
          ceased_to_act: formatDate(practitioner.ceased_to_act_on),
          address: formatAddress(practitioner.address),
        }),
      ),
      notes: insolvencyCase.notes ?? [],
    })),
  };
}
