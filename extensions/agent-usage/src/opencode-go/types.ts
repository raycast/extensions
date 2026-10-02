export interface OpencodegoWindowUsage {
  status: string;
  percent: number;
  resetsAt: string | null;
}

export interface OpencodegoUsage {
  rolling: OpencodegoWindowUsage;
  weekly: OpencodegoWindowUsage;
  monthly: OpencodegoWindowUsage;
}

export interface OpencodegoError {
  type: "not_configured" | "unauthorized" | "forbidden" | "network_error" | "parse_error" | "unknown";
  message: string;
}
