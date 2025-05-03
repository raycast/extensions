export interface WorkspaceObject {
  id: string;
  model: "workspace";
  name: string;
  createdUserId: string;
  key: string;
  planType: string;
  url: string;
  primaryAuth: unknown;
  hue: number;
  iconUrl: string | null;
  urlType: string;
  allowedEmailDomains: string[];
  allowedEmailDomainsEnabled: boolean;
  restrictEmailDomainsEnabled: boolean;
  authMethods: AuthMethod[];
  frozen: boolean;
  createdAt: string;
  trialEnd: unknown;
  searchHistoryLimited: boolean;
  copilotEnabled: boolean;
  copilotFeatures: unknown;
  templateType: unknown;
  ssoConnections: unknown;
  duplicateStatusId: unknown;
  templatesEnabled: boolean;
  sessionDurationHours: unknown;
  billingAnchorTimestamp: number;
}

export interface AuthMethod {
  type: string;
  enabled: boolean;
}
