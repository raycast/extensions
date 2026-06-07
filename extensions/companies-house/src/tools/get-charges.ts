import { getCharges } from "../api";
import { formatDate } from "../helpers";

type Input = {
  /** The Companies House company number. */
  companyNumber: string;
};

/** List charges (mortgages) registered against a company, including their status and who is entitled to them. */
export default async function tool(input: Input) {
  const res = await getCharges(input.companyNumber);
  return {
    total: res.total_count,
    satisfied: res.satisfied_count,
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
