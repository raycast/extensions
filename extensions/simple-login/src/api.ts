import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://app.simplelogin.io/api";

export interface AliasContact {
  email: string;
  name: string | null;
  reverse_alias: string;
}

export interface AliasActivity {
  action: "forward" | "reply" | "block" | "bounced";
  timestamp: number;
  contact: AliasContact;
}

export interface Alias {
  id: number;
  email: string;
  name: string | null;
  enabled: boolean;
  creation_date: string;
  creation_timestamp: number;
  note: string | null;
  nb_block: number;
  nb_forward: number;
  nb_reply: number;
  mailbox: {
    id: number;
    email: string;
  };
  mailboxes: Array<{
    id: number;
    email: string;
  }>;
  support_pgp: boolean;
  disable_pgp: boolean;
  pinned: boolean;
  latest_activity: AliasActivity | null;
}

export class SimpleLoginError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "SimpleLoginError";
  }
}

function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authentication: apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new SimpleLoginError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export interface AliasSuffix {
  suffix: string;
  signed_suffix: string;
  is_custom: boolean;
  is_premium: boolean;
}

export interface AliasOptions {
  can_create: boolean;
  prefix_suggestion: string;
  suffixes: AliasSuffix[];
  recommendation?: {
    alias: string;
    hostname: string;
  };
}

export interface GetAliasOptionsParams {
  hostname?: string;
}

export async function getAliasOptions(params: GetAliasOptionsParams = {}): Promise<AliasOptions> {
  const urlParams = new URLSearchParams();
  if (params.hostname) urlParams.set("hostname", params.hostname);

  const query = urlParams.toString();
  const endpoint = `/v5/alias/options${query ? `?${query}` : ""}`;

  return request<AliasOptions>(endpoint);
}

export interface CreateCustomAliasOptions {
  alias_prefix: string;
  signed_suffix: string;
  mailbox_ids: number[];
  note?: string;
  name?: string;
  hostname?: string;
}

interface CreateCustomAliasBody {
  alias_prefix: string;
  signed_suffix: string;
  mailbox_ids: number[];
  note?: string;
  name?: string;
}

export async function createCustomAlias(options: CreateCustomAliasOptions): Promise<Alias> {
  const urlParams = new URLSearchParams();
  if (options.hostname) urlParams.set("hostname", options.hostname);

  const query = urlParams.toString();
  const endpoint = `/v3/alias/custom/new${query ? `?${query}` : ""}`;

  const body: CreateCustomAliasBody = {
    alias_prefix: options.alias_prefix,
    signed_suffix: options.signed_suffix,
    mailbox_ids: options.mailbox_ids,
  };
  if (options.note) body.note = options.note;
  if (options.name) body.name = options.name;

  return request<Alias>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface Mailbox {
  id: number;
  email: string;
  default: boolean;
  creation_timestamp: number;
  nb_alias: number;
  verified: boolean;
}

interface MailboxesResponse {
  mailboxes: Mailbox[];
}

export async function getMailboxes(): Promise<Mailbox[]> {
  const response = await request<MailboxesResponse>("/v2/mailboxes");
  return response.mailboxes;
}

export interface CreateRandomAliasOptions {
  hostname?: string;
  mode?: "uuid" | "word";
  note?: string;
}

export async function createRandomAlias(options: CreateRandomAliasOptions = {}): Promise<Alias> {
  const params = new URLSearchParams();
  if (options.hostname) params.set("hostname", options.hostname);
  if (options.mode) params.set("mode", options.mode);

  const query = params.toString();
  const endpoint = `/alias/random/new${query ? `?${query}` : ""}`;

  return request<Alias>(endpoint, {
    method: "POST",
    body: options.note ? JSON.stringify({ note: options.note }) : undefined,
  });
}

export type AliasFilter = "pinned" | "enabled" | "disabled";

export interface GetAliasesParams {
  page_id: number;
  filter?: AliasFilter;
  query?: string;
}

interface AliasesResponse {
  aliases: Alias[];
}

export async function getAliases(params: GetAliasesParams): Promise<Alias[]> {
  const urlParams = new URLSearchParams();
  urlParams.set("page_id", params.page_id.toString());
  if (params.filter) urlParams.set(params.filter, "true");

  const response = await request<AliasesResponse>(`/v2/aliases?${urlParams.toString()}`, {
    method: "POST",
    body: params.query ? JSON.stringify({ query: params.query }) : undefined,
  });
  return response.aliases;
}

interface ToggleAliasResponse {
  enabled: boolean;
}

export async function toggleAlias(aliasId: number): Promise<boolean> {
  const response = await request<ToggleAliasResponse>(`/aliases/${aliasId}/toggle`, {
    method: "POST",
  });
  return response.enabled;
}

export interface UpdateAliasOptions {
  note?: string;
  name?: string;
  mailbox_id?: number;
  mailbox_ids?: number[];
  disable_pgp?: boolean;
  pinned?: boolean;
}

export async function updateAlias(aliasId: number, options: UpdateAliasOptions): Promise<Alias> {
  return request<Alias>(`/aliases/${aliasId}`, {
    method: "PATCH",
    body: JSON.stringify(options),
  });
}
