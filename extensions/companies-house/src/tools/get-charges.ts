import { getCharges } from "../api";
import { formatDate } from "../helpers";

type Input = {
  /**
   * The Companies House company number, e.g. "09446231" or "OC394454". Eight
   * characters: eight digits, or two letters followed by six digits. Call
   * search-companies first when you only have a company name.
   */
  companyNumber: string;
};

/** List charges (mortgages) registered against a company, including their status and who is entitled to them. */
export default async function tool(input: Input) {
  const res = await getCharges(input.companyNumber, 0);

  // A company with no charges 404s, which the API layer turns into `undefined`.
  // Saying so plainly stops the model reporting an absence as a lookup failure.
  if (!res) {
    return {
      total: 0,
      charges: [],
      note: "Companies House holds no charge records for this company.",
    };
  }

  return {
    total: res.total_count,
    satisfied: res.satisfied_count,
    part_satisfied: res.part_satisfied_count,
    returned: res.items?.length ?? 0,
    charges: (res.items ?? []).map((charge) => ({
      classification: charge.classification?.description,
      status: charge.status,
      created: formatDate(charge.created_on),
      satisfied_on: formatDate(charge.satisfied_on),
      persons_entitled: (charge.persons_entitled ?? [])
        .map((person) => person.name)
        .filter(Boolean),
    })),
  };
}
