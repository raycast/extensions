import { getCompany } from "../api";
import {
  companyStatusLabel,
  companyTypeLabel,
  formatAddress,
  formatDate,
  jurisdictionLabel,
  sicCodeLabel,
} from "../helpers";

type Input = {
  /** The Companies House company number, e.g. "09446231" or "OC394454". */
  companyNumber: string;
};

/** Get the full Companies House profile for a company: status, type, incorporation date, registered office, nature of business (SIC), accounts and confirmation-statement due dates, and charge/insolvency flags. */
export default async function tool(input: Input) {
  const company = await getCompany(input.companyNumber);
  return {
    company_number: company.company_number,
    name: company.company_name,
    status: companyStatusLabel(company.company_status),
    type: companyTypeLabel(company.type),
    incorporated: formatDate(company.date_of_creation),
    dissolved: formatDate(company.date_of_cessation),
    jurisdiction: jurisdictionLabel(company.jurisdiction),
    registered_office: formatAddress(company.registered_office_address),
    sic_codes: (company.sic_codes ?? []).map(sicCodeLabel),
    accounts_next_due: formatDate(company.accounts?.next_due),
    confirmation_statement_next_due: formatDate(
      company.confirmation_statement?.next_due,
    ),
    has_charges: company.has_charges ?? false,
    has_insolvency_history: company.has_insolvency_history ?? false,
  };
}
