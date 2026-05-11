export interface GandiDomain {
  fqdn: string;
  domain: string;
  tld: string;
  status: string[];
  dates: {
    created_at: string;
    updated_at: string;
    registry_created_at: string;
    registry_ends_at: string;
    hold_begins_at?: string;
    hold_ends_at?: string;
    pending_delete_ends_at?: string;
  };
  can_tld_lock: boolean;
  is_locked: boolean;
  autorenew: boolean;
  nameserver: {
    current: string;
    hosts?: string[];
  };
  owner: string;
  tags?: string[];
  sharing_id?: string;
  services?: string[];
}

export interface DomainAvailabilityPrice {
  duration_unit: string;
  min_duration: number;
  max_duration: number;
  // Gandi returns integer minor units (e.g., cents) in most cases; some responses may be micro-units.
  // UI should detect scale by comparing typical ranges.
  price_after_taxes?: number;
  price_before_taxes?: number;
  discount?: boolean;
}
export interface DomainAvailability {
  // Currency code as returned by the API (may be undefined for some registries)
  currency?: string;
  available: boolean;
  // min_period?: number;
  // max_period?: number;
  taxes?: Array<{
    type: string;
    rate: number;
  }>;
  products?: Array<{
    action: string;
    prices: DomainAvailabilityPrice[];
    phases?: Array<{
      name: string;
      starts_at?: string;
      ends_at?: string;
    }>;
    process: string;
    status:
      | "available"
      | "available_reserved"
      | "available_preorder"
      | "unavailable"
      | "unavailable_premium"
      | "unavailable_restricted"
      | "error_invalid"
      | "error_refused"
      | "error_timeout"
      | "error_unknown"
      | "reserved_corporate"
      | "pending"
      | "error_eoi";
  }>;
}

export interface DNSRecord {
  rrset_name: string;
  rrset_type: string;
  rrset_ttl: number;
  rrset_values: string[];
  rrset_href?: string;
}

export interface WebsiteMetadata {
  finalUrl: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export type GandiError =
  | {
      code: number;
      message: string;
      object?: string;
      cause?: string;
    }
  | {
      status: "error";
      errors: Array<{
        location: string;
        name: string;
        description: string;
      }>;
    };

export interface GandiMessage {
  message: string;
}
