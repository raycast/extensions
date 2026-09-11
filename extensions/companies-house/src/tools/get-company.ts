import { getCompany } from "../api";
import {
  companyStatusDetailLabel,
  companyStatusLabel,
  companyTypeLabel,
  formatAddress,
  formatDate,
  jurisdictionLabel,
  sicCodeLabel,
} from "../helpers";

type Input = {
  /**
   * The Companies House company number, e.g. "09446231" or "OC394454". Eight
   * characters: eight digits, or two letters followed by six digits. Call
   * search-companies first when you only have a company name.
   */
  companyNumber: string;
};

/** Get the full Companies House profile for a company: status and any status detail such as a proposal to strike off, type, incorporation date, registered office, nature of business (SIC), accounts and confirmation-statement due dates, and which further records the company has. */
export default async function tool(input: Input) {
  const company = await getCompany(input.companyNumber);
  return {
    company_number: company.company_number,
    name: company.company_name,
    status: companyStatusLabel(company.company_status),
    // Reported separately because it qualifies the status rather than
    // replacing it: a company can be active with a proposal to strike it off.
    status_detail: companyStatusDetailLabel(company.company_status_detail),
    type: companyTypeLabel(company.type),
    incorporated: formatDate(company.date_of_creation),
    dissolved: formatDate(company.date_of_cessation),
    jurisdiction: jurisdictionLabel(company.jurisdiction),
    registered_office: formatAddress(company.registered_office_address),
    sic_codes: (company.sic_codes ?? []).map(sicCodeLabel),
    accounts_next_due: formatDate(
      company.accounts?.next_accounts?.due_on ?? company.accounts?.next_due,
    ),
    accounts_overdue:
      company.accounts?.next_accounts?.overdue ?? company.accounts?.overdue,
    confirmation_statement_next_due: formatDate(
      company.confirmation_statement?.next_due,
    ),
    // Derived from `links` rather than the deprecated `has_charges` and
    // `has_insolvency_history`, which mean "has or had" and so stay true for a
    // company that cleared its charges years ago.
    has_charges_record: Boolean(company.links?.charges),
    has_insolvency_record: Boolean(company.links?.insolvency),
  };
}
