export interface CloudflareResponse<T> {
  result?: T;
  success: boolean;
  errors: CloudflareResponseInfo[];
}

export interface CloudflareResponseInfo {
  code: number;
  message: string;
}

export interface CloudflareEmailRoutingSettings {
  id: string;
  tag: string;
  name: string;
  enabled: boolean;
  skip_wizard: boolean;
  synced: boolean;
  admin_locked: boolean;
  status: string;
}

export interface ParsedAliasMeta {
  timestamp: number;
  label?: string;
  description?: string;
  email: string;
}

export interface AliasRule {
  id: string;
  name: ParsedAliasMeta;
  email: string;
  forwardsToEmail: string;
  enabled: boolean;
  createdAt: Date;
}

export interface ApiConfig {
  apiKey: string;
  zoneId: string;
  destinationEmail: string;
  preAllocatePool: boolean;
}

export type EmailRoutingSettings = CloudflareEmailRoutingSettings;

export interface CreateAliasFormData {
  label: string;
  description?: string;
}

export interface EditAliasFormData {
  label: string;
  description?: string;
  aliasId: string;
}

export interface CreateAliasProps {
  alias?: AliasRule;
}
