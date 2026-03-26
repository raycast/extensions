import { Icon } from "@raycast/api";

export type ServiceCategory =
  | "Compute"
  | "Storage"
  | "Database"
  | "Networking"
  | "Security"
  | "Management"
  | "Analytics"
  | "Application Integration"
  | "Developer Tools"
  | "Machine Learning"
  | "Containers"
  | "Serverless"
  | "Cost Management";

export interface AwsService {
  id: string;
  name: string;
  /** Full URL (starts with "https://") for global/special services, or path fragment for regional services */
  consoleUrl: string;
  aliases: string[];
  keywords: string[];
  category: ServiceCategory;
  isGlobal: boolean;
  icon: Icon;
}

export interface UsageRecord {
  serviceId: string;
  lastOpenedAt: number;
  openCount: number;
}

export type UsageMap = Record<string, UsageRecord>;
