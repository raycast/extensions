export type WindowStatus = "ok" | "rate-limited";

export interface WindowUsage {
  status: WindowStatus;
  percent: number;
  resetsAt: string;
}

export interface Usage {
  rolling: WindowUsage;
  weekly: WindowUsage;
  monthly: WindowUsage;
}

export interface ModelCost {
  input: number;
  output: number;
  cacheRead: number;
}

export interface Modality {
  input: string[];
  output: string[];
}

export type PickKind = "stretch" | "best-value";

export interface Model {
  id: string;
  cost: ModelCost | null;
  modalities: Modality | null;
  quota: number | null;
  isPick: PickKind | null;
}

export interface Picks {
  stretch: string | null;
  bestValue: string | null;
  computedAt: string;
}

export type Product = "go" | "zen";

export interface Catalog {
  go: Model[];
  zen: Model[];
}

export interface Payload {
  windows: Usage;
  models: Catalog;
  picks: Picks;
  updatedAt: string;
  offline: boolean;
}

export type FailureType =
  "no-key" | "bad-key" | "no-entitlement" | "offline" | "service";

export interface Failure {
  type: FailureType;
  message: string;
}

export function isKeyProblem(type: FailureType): boolean {
  return type === "no-key" || type === "bad-key" || type === "no-entitlement";
}

export type CollectResult =
  | { ok: true; payload: Payload; fromCache: boolean }
  | { ok: false; failure: Failure };

export interface PricingModel {
  id: string;
  cost: ModelCost;
  modalities: Modality | null;
}

export interface PricingCatalog {
  go: PricingModel[];
  zen: PricingModel[];
}
