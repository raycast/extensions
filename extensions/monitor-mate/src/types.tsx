export interface Resource {
  url: string;
  type: string;
  port: string;
  status?: boolean;
  lastChecked?: string;
  statusHistory: { status: boolean; timestamp: string }[];
}
