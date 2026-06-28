export interface DomainCheckResult {
  domain: string;
  status: "registered" | "available";
  registered: string | null;
  expires: string | null;
}

export interface BulkCheckResponse {
  error: number;
  data: {
    domains: DomainCheckResult[];
    summary: {
      total: number;
      available: number;
      registered: number;
    };
    duration: number;
  };
}

export interface WhoisParsed {
  id: string;
  registrar: string;
  registered: string;
  d_updated: string;
  expires: string;
  nameservers: string;
  status: string;
  name: string;
  suffix: string;
  created: string;
  type: number;
}

export interface WhoisResponse {
  prices: unknown[];
  type: number;
  parsed: WhoisParsed;
  raw: string;
}

export interface TrafficData {
  [date: string]: number;
}

export interface TrafficResponse {
  error: number;
  status: string;
  note: string;
  data: {
    domain: string;
    traffic: TrafficData;
  };
}
