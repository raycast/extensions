import { getFilingHistory } from "../api";
import { filingCategoryLabel, filingDescription, formatDate } from "../helpers";

type Input = {
  /** The Companies House company number. */
  companyNumber: string;
};

/** List a company's most recent filings (accounts, confirmation statements, officer changes, etc.) with human-readable descriptions. */
export default async function tool(input: Input) {
  const res = await getFilingHistory(input.companyNumber, 0);
  return (res.items ?? []).map((filing) => ({
    date: formatDate(filing.date),
    description: filingDescription(filing),
    category: filingCategoryLabel(filing.category),
    type: filing.type,
  }));
}
