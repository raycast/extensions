import { getPersonsWithSignificantControl } from "../api";
import {
  formatDate,
  formatDateOfBirth,
  pscKindLabel,
  pscNatureLabel,
  pscStatementLabel,
} from "../helpers";
import {
  describeExemption,
  explainAbsentPscs,
  explanationSummary,
} from "../psc-explanation";

type Input = {
  /**
   * The Companies House company number, e.g. "09446231" or "OC394454". Eight
   * characters: eight digits, or two letters followed by six digits. Call
   * search-companies first when you only have a company name.
   */
  companyNumber: string;
};

/** List the persons with significant control (beneficial owners) of a company, including their nature of control (e.g. share ownership or voting rights). Ceased entries stay on the register and are returned alongside current ones, marked as ceased. When the register is empty the result explains why, separating a market-listing exemption that is still in force from one that has ended, a statement filed in place of an entry, and a genuine gap in what the company has filed. */
export default async function tool(input: Input) {
  const res = await getPersonsWithSignificantControl(input.companyNumber, 0);
  const items = res.items ?? [];

  if (!items.length && (res.total_results ?? 0) === 0) {
    // An empty register is almost never "nobody controls this company". The
    // reason lives in the exemptions and statements resources, so it is read
    // before anything is reported about the absence.
    const explanation = await explainAbsentPscs(input.companyNumber);
    return {
      total: 0,
      persons_with_significant_control: [],
      register_is_empty_because: explanationSummary(explanation),
      exempt_now: explanation.exempt,
      exemptions_in_force: explanation.currentExemptions.map(describeExemption),
      exemptions_that_have_ended:
        explanation.endedExemptions.map(describeExemption),
      statements_filed: explanation.activeStatements.map((statement) => ({
        statement: pscStatementLabel(statement.statement),
        notified: formatDate(statement.notified_on),
      })),
      statements_withdrawn: explanation.withdrawnStatements.map(
        (statement) => ({
          statement: pscStatementLabel(statement.statement),
          withdrawn: formatDate(statement.ceased_on),
        }),
      ),
      note: explanation.unexplained
        ? "No exemption is in force and no statement has been filed in place of an entry. This is an absence of data, not evidence about who controls the company."
        : undefined,
    };
  }

  return {
    total: res.total_results,
    active_count: res.active_count,
    ceased_count: res.ceased_count,
    persons_with_significant_control: items.map((psc) => ({
      name: psc.name,
      kind: pscKindLabel(psc.kind),
      status: psc.ceased_on ? "Ceased" : "Active",
      natures_of_control: (psc.natures_of_control ?? []).map(pscNatureLabel),
      notified: formatDate(psc.notified_on),
      ceased: formatDate(psc.ceased_on),
      nationality: psc.nationality,
      born: formatDateOfBirth(psc.date_of_birth),
    })),
  };
}
