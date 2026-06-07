/**
 * Response shapes for the Companies House Public Data API.
 *
 * Fields are mostly optional: the API omits keys that don't apply (for example a
 * `resigned_on` date only appears for officers who have resigned), so defensive
 * typing keeps the UI code honest about what might be missing.
 */

export interface Address {
  care_of?: string;
  po_box?: string;
  premises?: string;
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

/** Only the month and year of birth are ever published (Companies House obfuscation). */
export interface DateOfBirth {
  month?: number;
  year?: number;
}

interface PagedResponse {
  total_results?: number;
  items_per_page?: number;
  start_index?: number;
}

// --- Company search -------------------------------------------------------

export interface CompanySearchItem {
  company_number: string;
  title: string;
  company_status?: string;
  company_type?: string;
  address_snippet?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  description?: string;
  kind?: string;
  links?: { self?: string };
}

export interface CompanySearchResponse extends PagedResponse {
  items?: CompanySearchItem[];
}

// --- Officer search -------------------------------------------------------

export interface OfficerSearchItem {
  title: string;
  description?: string;
  address_snippet?: string;
  appointment_count?: number;
  date_of_birth?: DateOfBirth;
  kind?: string;
  /** `links.self` is the officer's appointments resource, e.g. `/officers/{id}/appointments`. */
  links?: { self?: string };
}

export interface OfficerSearchResponse extends PagedResponse {
  items?: OfficerSearchItem[];
}

// --- Company profile ------------------------------------------------------

export interface CompanyProfile {
  company_name?: string;
  company_number: string;
  company_status?: string;
  company_status_detail?: string;
  type?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
  sic_codes?: string[];
  registered_office_address?: Address;
  registered_office_is_in_dispute?: boolean;
  accounts?: {
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
    last_accounts?: { made_up_to?: string; type?: string };
  };
  confirmation_statement?: {
    next_due?: string;
    next_made_up_to?: string;
    last_made_up_to?: string;
    overdue?: boolean;
  };
  has_charges?: boolean;
  has_insolvency_history?: boolean;
  has_been_liquidated?: boolean;
  can_file?: boolean;
  previous_company_names?: {
    name?: string;
    ceased_on?: string;
    effective_from?: string;
  }[];
  links?: {
    self?: string;
    filing_history?: string;
    officers?: string;
    charges?: string;
    persons_with_significant_control?: string;
  };
}

// --- Company officers -----------------------------------------------------

export interface CompanyOfficer {
  name: string;
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
  date_of_birth?: DateOfBirth;
  nationality?: string;
  occupation?: string;
  country_of_residence?: string;
  address?: Address;
  links?: { officer?: { appointments?: string } };
}

export interface CompanyOfficersResponse extends PagedResponse {
  items?: CompanyOfficer[];
  active_count?: number;
  resigned_count?: number;
}

// --- Officer appointments -------------------------------------------------

export interface AppointmentItem {
  appointed_to?: {
    company_name?: string;
    company_number?: string;
    company_status?: string;
  };
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
  occupation?: string;
  nationality?: string;
  address?: Address;
}

export interface AppointmentsResponse extends PagedResponse {
  name?: string;
  date_of_birth?: DateOfBirth;
  is_corporate_officer?: boolean;
  items?: AppointmentItem[];
}

// --- Filing history -------------------------------------------------------

export interface FilingItem {
  transaction_id?: string;
  type?: string;
  category?: string;
  subcategory?: string;
  date?: string;
  action_date?: string;
  description?: string;
  /** Substitution values for the description template; values are usually strings but can be nested. */
  description_values?: Record<string, unknown>;
  paper_filed?: boolean;
  pages?: number;
  links?: { self?: string; document_metadata?: string };
}

export interface FilingHistoryResponse {
  items?: FilingItem[];
  total_count?: number;
  items_per_page?: number;
  start_index?: number;
  filing_history_status?: string;
}

// --- Charges --------------------------------------------------------------

export interface ChargeItem {
  id?: string;
  charge_number?: number;
  charge_code?: string;
  classification?: { type?: string; description?: string };
  status?: string;
  created_on?: string;
  delivered_on?: string;
  satisfied_on?: string;
  acquired_on?: string;
  persons_entitled?: { name?: string }[];
  secured_details?: { type?: string; description?: string };
  particulars?: {
    description?: string;
    type?: string;
    contains_floating_charge?: boolean;
  };
  links?: { self?: string };
}

export interface ChargesResponse {
  items?: ChargeItem[];
  total_count?: number;
  unfiltered_count?: number;
  satisfied_count?: number;
  part_satisfied_count?: number;
}
