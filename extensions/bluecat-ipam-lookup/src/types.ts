export interface ListResponse<T> {
  count: number;
  totalCount?: number;
  data: T[];
}

export interface BamEntity {
  id: number;
  type: string;
  name?: string | null;
  userDefinedFields?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface IPAddress extends BamEntity {
  address: string;
  state?: string | null;
  macAddress?: { address?: string | null } | null;
}

export interface Network extends BamEntity {
  range: string;
  gateway?: string | null;
}

export interface ResourceRecord extends BamEntity {
  absoluteName: string;
  ttl?: number | null;
  recordType?: string | null;
  rdata?: string | null;
  linkedRecord?: { name?: string | null; absoluteName?: string | null } | null;
  addresses?: Array<{ address?: string } | string> | null;
  zone?: { id?: number } | null;
  _links?: Record<string, { href?: string } | undefined>;
}

export type SearchResult =
  | { kind: "address"; item: IPAddress; network?: Network }
  | { kind: "network"; item: Network }
  | { kind: "record"; item: ResourceRecord; zoneId?: number };
