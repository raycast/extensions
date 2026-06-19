export interface ApiKeyData {
  hash: string;
  name: string;
  disabled: boolean;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  include_byok_in_limit: boolean;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  byok_usage: number;
  byok_usage_daily: number;
  byok_usage_weekly: number;
  byok_usage_monthly: number;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
}
