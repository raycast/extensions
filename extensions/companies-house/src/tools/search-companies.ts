import { searchCompanies } from "../api";
import { companyStatusLabel, companyTypeLabel, formatDate } from "../helpers";

type Input = {
  /** The company name or company number to search for, e.g. "Monzo Bank" or "09446231". */
  query: string;
};

/** Search the UK Companies House register for companies by name or number. Start here whenever you only have a company name: the company_number on each match is what every other company tool takes. Returns up to 20 matches with their company number, status and registered address. */
export default async function tool(input: Input) {
  const res = await searchCompanies(input.query, 0);
  return {
    total: res.total_results,
    returned: res.items?.length ?? 0,
    companies: (res.items ?? []).map((company) => ({
      company_number: company.company_number,
      name: company.title,
      status: companyStatusLabel(company.company_status),
      type: companyTypeLabel(company.company_type),
      address: company.address_snippet,
      incorporated: formatDate(company.date_of_creation),
    })),
  };
}
