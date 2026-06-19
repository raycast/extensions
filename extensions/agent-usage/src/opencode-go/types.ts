export interface OpencodegoQuota {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

export interface OpencodegoUsage {
  planName: string;
  primary: OpencodegoQuota;
  quotas: OpencodegoQuota[];
  resetsAt: string | null;
}

export interface OpencodegoError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
