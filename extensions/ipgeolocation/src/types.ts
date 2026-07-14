export interface Preferences {
  apiKey: string;
  plan: "free" | "paid";
}

export interface IPData {
  ip: string;
  hostname?: string;

  location: {
    continent_code: string;
    continent_name: string;

    country_code2: string;
    country_code3: string;
    country_name: string;
    country_name_official: string;
    country_capital: string;

    state_prov: string;
    state_code: string;

    district?: string;
    city: string;

    dma_code?: string;
    zipcode: string;

    latitude: string;
    longitude: string;

    is_eu: boolean;

    country_flag: string;
    country_emoji: string;
  };

  country_metadata?: {
    calling_code: string;
    tld: string;
    languages: string | string[];
  };

  network?: {
    connection_type?: string;
    route: string;
    is_anycast?: boolean;
  };

  currency: {
    code: string;
    name: string;
    symbol: string;
  };

  asn: {
    as_number: string;
    organization: string;
    country: string;
    type?: string;
    domain?: string;
    rir?: string;
  };

  company?: {
    name: string;
    type: string;
    domain: string;
  };

  security?: {
    threat_score: number;

    is_tor: boolean;
    is_proxy: boolean;
    proxy_provider_names?: Record<string, unknown>;
    proxy_confidence_score?: number;
    proxy_last_seen?: string;

    is_residential_proxy: boolean;

    is_vpn: boolean;
    vpn_provider_names?: Record<string, unknown>;
    vpn_confidence_score?: number;
    vpn_last_seen?: string;

    is_relay: boolean;
    relay_provider_name?: string;

    is_anonymous: boolean;
    is_known_attacker: boolean;
    is_bot: boolean;
    is_spam: boolean;

    is_cloud_provider: boolean;
    cloud_provider_name?: string;
  };

  abuse?: {
    country?: string;
    address: string;

    emails: string | string[];
    phone_numbers: string | string[];
  };

  time_zone: {
    name: string;

    offset: number;
    offset_with_dst: number;

    current_time: string;
    current_time_unix: number;

    current_tz_abbreviation: string;
    current_tz_full_name: string;

    standard_tz_abbreviation: string;
    standard_tz_full_name: string;

    is_dst: boolean;
    dst_savings: number;
    dst_exists: boolean;

    dst_tz_abbreviation?: string;
    dst_tz_full_name?: string;

    dst_start?: {
      utc_time: string;
      duration: string;
      gap: boolean;

      date_time_after: string;
      date_time_before: string;

      overlap: boolean;
    };

    dst_end?: {
      utc_time: string;
      duration: string;
      gap: boolean;

      date_time_after: string;
      date_time_before: string;

      overlap: boolean;
    };
  };
}

export interface HistoryEntry {
  query: string;
  data: IPData;
  timestamp: number;
}
