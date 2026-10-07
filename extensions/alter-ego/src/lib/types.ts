export type TargetType = "app" | "deeplink" | "url" | "path";

export interface Target {
  type: TargetType;
  value: string;
}

/** macOS username -> Target */
export type AlterEgoMap = Record<string, Target>;

/** Everything a single Alter Ego Quicklink encodes: its (required) name and its per-user map. */
export interface AlterEgoPayload {
  name: string;
  map: AlterEgoMap;
}

export const TARGET_TYPES: readonly TargetType[] = ["app", "deeplink", "url", "path"];
