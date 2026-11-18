export type FlagType = "boolean" | "rollout" | "multivariant";
export type FlagStatus = "active" | "inactive" | "archived";

export interface Flag {
  id: string;
  key: string;
  name?: string | null;
  description?: string | null;
  type: FlagType;
  status: FlagStatus;
  defaultValue: boolean;
  rolloutPercentage: number;
  rolloutBy?: string | null;
  environment?: string | null;
  persistAcrossAuth?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlagCreateInput {
  key: string;
  name?: string;
  description?: string;
  type: FlagType;
  status: FlagStatus;
  defaultValue: boolean;
  rolloutPercentage: number;
  environment?: string;
}

export interface FlagUpdateInput {
  name?: string | null;
  description?: string | null;
  type?: FlagType;
  status?: FlagStatus;
  defaultValue?: boolean;
  rolloutPercentage?: number;
  environment?: string | null;
}
