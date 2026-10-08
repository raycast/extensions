export type Endpoint = {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  isEnabled: boolean;
  emailNotifications: boolean;
  redirectUrl: string;
  targetEmails: string[];
  icon: string;
  color: string;
};
export type CreateEndpointRequest = {
  slug: string;
  name: string;
};
export type Key = {
  id: string;
  name: string;
  workspaceId: string;
  lastAccess: string;
  expiresAt: string;
};
export type CreateKeyRequest = {
  name: string;
  expiresAt: string;
};
export type Submission = {
  id: string;
  endpointId: string;
  data: unknown;
  location: string;
  isSpam: boolean;
  isRead: boolean;
};
