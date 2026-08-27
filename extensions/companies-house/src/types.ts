/** Props for company-scoped list views that show a company number and optional title. */
export type CompanyViewProps = {
  companyNumber: string;
  companyName?: string;
};

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
    /** @deprecated Companies House replaced this with `next_accounts.due_on`. */
    next_due?: string;
    /** @deprecated Companies House replaced this with `next_accounts.period_end_on`. */
    next_made_up_to?: string;
    /** @deprecated Companies House replaced this with `next_accounts.overdue`. */
    overdue?: boolean;
    next_accounts?: {
      due_on?: string;
      period_end_on?: string;
      period_start_on?: string;
      overdue?: boolean;
    };
    last_accounts?: { made_up_to?: string; type?: string };
  };
  confirmation_statement?: {
    next_due?: string;
    next_made_up_to?: string;
    last_made_up_to?: string;
    overdue?: boolean;
  };
  /**
   * @deprecated Means "has or had". A company that has satisfied every charge
   * still reports true, so prefer `links.charges`.
   */
  has_charges?: boolean;
  /**
   * @deprecated Means "has or had". Prefer `links.insolvency`.
   */
  has_insolvency_history?: boolean;
  /** @deprecated Prefer `links.insolvency` and the insolvency record itself. */
  has_been_liquidated?: boolean;
  can_file?: boolean;
  previous_company_names?: {
    name?: string;
    ceased_on?: string;
    effective_from?: string;
  }[];
  /**
   * Which sub-resources this company actually has. Companies House omits the
   * key entirely when there is nothing to link to, which makes this the honest
   * way to ask "does this company have charges?" — unlike the deprecated
   * `has_charges`, which stays true once satisfied.
   */
  links?: {
    self?: string;
    filing_history?: string;
    officers?: string;
    charges?: string;
    insolvency?: string;
    persons_with_significant_control?: string;
    persons_with_significant_control_statements?: string;
    registers?: string;
    exemptions?: string;
    uk_establishments?: string;
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
  /**
   * Officers who are neither in post nor resigned — the members of a dissolved
   * company, typically. They carry no `resigned_on` and no per-item flag
   * distinguishes them, so the only signal that an officer is not in post is
   * this count being non-zero while `active_count` is zero.
   */
  inactive_count?: number;
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

// --- Persons with significant control ------------------------------------

export interface PscItem {
  name?: string;
  kind?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
  nationality?: string;
  country_of_residence?: string;
  date_of_birth?: DateOfBirth;
  address?: Address;
  identification?: {
    legal_form?: string;
    legal_authority?: string;
    place_registered?: string;
    registration_number?: string;
    country_registered?: string;
  };
  links?: { self?: string };
}

export interface PscResponse extends PagedResponse {
  items?: PscItem[];
  active_count?: number;
  ceased_count?: number;
}

// --- PSC statements -------------------------------------------------------

/**
 * A statement filed in place of a PSC entry — for example that the company
 * believes it has no registrable person, or that its enquiries are ongoing.
 * A statement with a `ceased_on` date has been withdrawn and no longer
 * explains anything about the register today.
 */
export interface PscStatementItem {
  statement: string;
  notified_on?: string;
  ceased_on?: string;
  kind?: string;
  links?: { self?: string };
}

export interface PscStatementsResponse extends PagedResponse {
  items?: PscStatementItem[];
  active_count?: number;
  ceased_count?: number;
}

// --- Exemptions -----------------------------------------------------------

export interface ExemptionPeriod {
  exempt_from?: string;
  /** Absent while the exemption is open-ended. A date in the past means it has ended. */
  exempt_to?: string;
}

/**
 * Keyed by exemption name (underscored, e.g.
 * `psc_exempt_as_trading_on_uk_regulated_market`), each with the periods the
 * exemption applied for.
 */
export interface ExemptionsResponse {
  exemptions?: Record<
    string,
    { exemption_type?: string; items?: ExemptionPeriod[] }
  >;
  kind?: string;
  links?: { self?: string };
}

// --- Insolvency -----------------------------------------------------------

export interface InsolvencyPractitioner {
  name?: string;
  address?: Address;
  appointed_on?: string;
  ceased_to_act_on?: string;
  role?: string;
}

export interface InsolvencyCase {
  /** Companies House sends this as a string, e.g. "1". */
  number?: string | number;
  type?: string;
  dates?: { type?: string; date?: string }[];
  notes?: string[];
  practitioners?: InsolvencyPractitioner[];
  links?: { charge?: string };
}

export interface InsolvencyResponse {
  cases?: InsolvencyCase[];
  /** Overall proceedings in force, e.g. `["liquidation"]`. */
  status?: string[];
}

// --- Disqualified officers ------------------------------------------------

export interface DisqualifiedOfficerSearchItem {
  title: string;
  description?: string;
  address_snippet?: string;
  /** A full ISO timestamp here, unlike the month/year given elsewhere. */
  date_of_birth?: string;
  kind?: string;
  /** `links.self` is `/disqualified-officers/{natural|corporate}/{id}`. */
  links?: { self?: string };
}

export interface DisqualifiedOfficerSearchResponse extends PagedResponse {
  items?: DisqualifiedOfficerSearchItem[];
}

export interface Disqualification {
  disqualified_from?: string;
  /** A sanctions disqualification uses "9999-12-31" to mean no end date. */
  disqualified_until?: string;
  disqualification_type?: string;
  case_identifier?: string;
  court_name?: string;
  heard_on?: string;
  undertaken_on?: string;
  address?: Address;
  company_names?: string[];
  reason?: { act?: string; section?: string; description_identifier?: string };
}

export interface DisqualifiedOfficer {
  /** Full ISO date on this resource, not the month/year published elsewhere. */
  date_of_birth?: string;
  forename?: string;
  other_forenames?: string;
  surname?: string;
  title?: string;
  honours?: string;
  /** Corporate entries carry a single `name` instead of name parts. */
  name?: string;
  nationality?: string;
  kind?: string;
  disqualifications?: Disqualification[];
  links?: { self?: string };
}

// --- Filed documents ------------------------------------------------------

export interface DocumentMetadata {
  company_number?: string;
  barcode?: string;
  category?: string;
  /** Companies House's own name for the file, e.g. "09446231_tm01_2026-07-30". */
  filename?: string;
  created_at?: string;
  pages?: number;
  /** Keyed by media type. Only the types listed here can be requested. */
  resources?: Record<string, { content_length?: number }>;
  links?: { self?: string; document?: string };
}
