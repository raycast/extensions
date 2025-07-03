export interface Status {
  protection_enabled: boolean;
  filtering_enabled: boolean;
  dns_queries: number;
  blocked_today: number;
  protection_disabled_duration: number | null;
  protection_disabled_until: string | null;
}
