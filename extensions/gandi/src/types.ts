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

export interface DomainAvailability {
  // Currency code as returned by the API (may be undefined for some registries)
  currency?: string;
  available: boolean;
  min_period?: number;
  max_period?: number;
  taxes?: Array<{
    type: string;
    rate: number;
  }>;
  products?: Array<{
    action: string;
    prices: Array<{
      duration_unit: string;
      min_duration: number;
      max_duration: number;
      // Gandi returns integer minor units (e.g., cents) in most cases; some responses may be micro-units.
      // UI should detect scale by comparing typical ranges.
      price_after_taxes?: number;
      price_before_taxes?: number;
      discount?: boolean;
    }>;
    process: string;
    phases?: Array<{
      name: string;
      starts_at?: string;
      ends_at?: string;
    }>;
  }>;
}

export interface DNSRecord {
  rrset_name: string;
  rrset_type: string;
  rrset_ttl: number;
  rrset_values: string[];
  rrset_href?: string;
}

export interface DNSZone {
  uuid: string;
  name: string;
  created_at?: number;
  updated_at?: number;
  apex_alias?: boolean;
}

export interface Certificate {
  id: string;
  cn: string;
  dates: {
    created_at: string;
    ends_at: string;
    starts_at: string;
    updated_at: string;
  };
  package: string;
  status: string;
}

export interface Organization {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  type: string;
  corporate_name?: string;
  reseller: boolean;
}

export interface WebsiteMetadata {
  finalUrl: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export interface Mailbox {
  id: string;
  address: string;
  domain: string;
  quota_used: number;
  login: string;
  mailbox_type: string;
  aliases?: string[];
}

export interface GandiError {
  code: string;
  message: string;
  object?: string;
  cause?: string;
  errors?: Array<{
    location: string;
    name: string;
    description: string;
  }>;
}
