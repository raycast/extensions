/** Wire types for ProxyManager's control protocol (v1). See docs/control-protocol.md. */

export type RoutingState = "off" | "starting" | "on" | "degraded" | "stopping";

export interface Status {
  state: RoutingState | string;
  routingIntended: boolean;
  tunnelUp: boolean;
  bindHost: string;
  port: number;
  lastError: string | null;
  onboardingComplete: boolean;
  authorizationDeferred: boolean;
  targetsCount: number;
  appRulesCount: number;
  appVersion: string;
  protocolVersion: number;
}

export interface Target {
  id: string;
  pattern: string;
  enabled: boolean;
}

export interface Preset {
  id: string;
  name: string;
  summary: string;
  count: number;
}

export type AppRoutingMode = "TUNNEL" | "TARGETS" | "DIRECT";
export type AppRuleKeyKind = "BUNDLE" | "EXECUTABLE" | "EXECUTABLE_NAME";

export interface AppRule {
  id: string;
  key: string;
  keyKind: AppRuleKeyKind;
  mode: AppRoutingMode;
  enabled: boolean;
}

export interface AppsSnapshot {
  enabled: boolean;
  defaultMode: AppRoutingMode;
  recordInTelemetry: boolean;
  rules: AppRule[];
}

export interface Explanation {
  host: string;
  decision: "tunnel" | "direct";
  matchedPattern: string | null;
  matchedTargetID: string | null;
  appMode: AppRoutingMode | null;
  appRuleKey: string | null;
}

export interface AppResolution {
  bundleID: string | null;
  path: string | null;
  displayName: string | null;
  mode: AppRoutingMode;
  ruleID: string | null;
}

export interface IntegrationErrorPayload {
  code: string;
  message: string;
  field?: string | null;
}

export interface IntegrationResult<T> {
  v: number;
  id: string;
  action: string;
  ok: boolean;
  changed: boolean;
  data: T;
  error: IntegrationErrorPayload | null;
  auditId: string;
  durationMs: number;
}
