export type AtomDomainAvailability =
  | {
      availability: 1;
      status: "available";
      domain_price: {
        unit_price: number;
        renewal_price: number;
        icann_fee: number;
        is_premium: boolean;
        registration_length: number;
        subtotal: number;
        vat_rate: number;
        vat_amount: number;
        total: number;
      };
    }
  | {
      availability: 0;
      status: "unavailable";
    }
  | {
      availability: -1;
      status: "unknown";
    };

export type AtomContact = {
  handle: string;
  type: "registrant_user" | "contact_handle";
  label: string | null;
  name: string;
  email: string;
  phone: string;
  fax: string | null;
  organization: string | null;
  address: string[];
  city: string;
  state: string | null;
  zip: string;
  country: string;
  disclosed_fields: string[];
  verified: boolean;
};
export type AtomContactCreate = {
  label: string;
  first_name: string;
  last_name: string;
  organization: string;
  email: string;
  phone: string;
  address_1: string;
  address_2: string;
  country: string;
  city: string;
  state: string;
  zip: string;
  disclosed_fields: string[];
};

export type AtomDomain = {
  domain_name: string;
  status: string;
  extension: string;
  created_date: string;
  updated_date: string;
  expiry_date: string;
  auto_renew: boolean;
  privacy_protect: boolean;
  transfer_locked: boolean;
  icann_transfer_lock: boolean;
  icann_transfer_lock_expires_at: string | null;
  can_transfer_out: boolean;
  dnssec_enabled: boolean;
  nameservers: string[];
  registrant_handle: string;
  admin_handle?: string | null;
  tech_handle?: string | null;
  billing_handle?: string | null;
};

export type AtomNameservers = {
  nameservers: string[];
  type: string;
};

export type AtomDNSRecord = {
  id: number;
  type: string;
  name: string;
  content: string;
  ttl: number;
  comment: string | null;
};

export type Pagination = {
  pagination: {
    current_page: number | null;
    total_pages: number;
    per_page: number;
    total_records: number;
  };
};
export type AtomSuccess<T> = {
  success: true;
  data: T;
};
export type AtomError = {
  success: false;
  error: string;
  message: string;
  violations?: Array<{ field: string; message: string }>;
};
