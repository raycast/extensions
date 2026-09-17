import { getFilingHistory } from "../api";
import { filingCategoryLabel, filingDescription, formatDate } from "../helpers";

type Input = {
  /**
   * The Companies House company number, e.g. "09446231" or "OC394454". Eight
   * characters: eight digits, or two letters followed by six digits. Call
   * search-companies first when you only have a company name.
   */
  companyNumber: string;
};

/** List a company's most recent filings (accounts, confirmation statements, officer changes, etc.) with human-readable descriptions. */
export default async function tool(input: Input) {
  const res = await getFilingHistory(input.companyNumber, 0);
  return {
    total: res.total_count,
    returned: res.items?.length ?? 0,
    filings: (res.items ?? []).map((filing) => ({
      date: formatDate(filing.date),
      description: filingDescription(filing),
      category: filingCategoryLabel(filing.category),
      type: filing.type,
    })),
  };
}
