interface ErrorResponse {
  data?: never;
  error: string;
}
interface Pagination {
  limit: number;
  offset: number;
  total: number;
  hasMore?: boolean;
}
interface WebhookConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}
interface EmailConfig {
  forwardTo: string;
  senderName: string;
  subjectPrefix: string;
  includeAttachments: boolean;
}
interface EmailGroupConfig {
  emails: string[];
}
type EndpointConfig = WebhookConfig | EmailConfig | EmailGroupConfig;
interface EndpointWithStats {
  id: string;
  name: string;
  type: "webhook" | "email" | "email_group";
  config: EndpointConfig;
  isActive: boolean;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  groupEmails: string[] | null;
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
    lastDelivery: string | null;
  };
}
interface GetEndpointsResponse {
  data: EndpointWithStats[];
  pagination: Pagination;
}
interface PostEndpointsRequest {
  name: string;
  type: "webhook" | "email" | "email_group";
  description?: string;
  config: EndpointConfig;
}
interface PostEndpointsResponse {
  id: string;
  name: string;
  type: string;
  config: EndpointConfig;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
}
interface DomainWithStats {
  id: string;
  domain: string;
  status: string;
  canReceiveEmails: boolean;
  hasMxRecords: boolean;
  domainProvider: string | null;
  providerConfidence: string | null;
  lastDnsCheck: Date | null;
  lastSesCheck: Date | null;
  isCatchAllEnabled: boolean;
  catchAllEndpointId: string | null;
  receiveDmarcEmails: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  stats: {
    totalEmailAddresses: number;
    activeEmailAddresses: number;
    hasCatchAll: boolean;
  };
  catchAllEndpoint?: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
  } | null;
  verificationCheck?: {
    dnsRecords?: Array<{
      type: string;
      name: string;
      value: string;
      status: string;
      lastChecked: Date;
    }>;
    sesStatus?: string;
    isFullyVerified?: boolean;
    lastChecked?: Date;
  };
}
interface GetDomainsResponse {
  data: DomainWithStats[];
  pagination: Pagination;
  meta: {
    totalCount: number;
    verifiedCount: number;
    statusBreakdown: Record<string, number>;
  };
}
interface PostDomainsRequest {
  domain: string;
}
interface EmailAddressWithDomain {
  id: string;
  address: string;
  domainId: string;
  webhookId: string | null;
  endpointId: string | null;
  isActive: boolean;
  isReceiptRuleConfigured: boolean;
  receiptRuleName: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  domain: {
    id: string;
    name: string;
    status: string;
  };
  routing: {
    type: "webhook" | "endpoint" | "none";
    id: string | null;
    name: string | null;
    isActive: boolean;
  };
}
interface GetEmailAddressesRequest {
  limit?: number;
  offset?: number;
  domainId?: string;
  isActive?: "true" | "false";
  isReceiptRuleConfigured?: "true" | "false";
}
interface GetEmailAddressesResponse {
  data: EmailAddressWithDomain[];
  pagination: Pagination;
}
interface PostEmailAddressesRequest {
  address: string;
  domainId: string;
  endpointId?: string;
  webhookId?: string;
  isActive?: boolean;
}
interface PostEmailsRequest {
  from: string;
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string | string[];
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
  scheduled_at?: string;
  timezone?: string;
}

interface DNSRecord {
  id: string;
  recordType: string;
  name: string;
  value: string;
}
interface GetDNSRecordsResponse {
  records: DNSRecord[];
}

export type {
  ErrorResponse,
  GetDomainsResponse,
  DomainWithStats,
  PostDomainsRequest,
  PostEmailsRequest,
  PostEndpointsRequest,
  PostEndpointsResponse,
  GetEmailAddressesResponse,
  PostEmailAddressesRequest,
  EmailAddressWithDomain,
  EmailConfig,
  EndpointWithStats,
  GetDNSRecordsResponse,
  GetEmailAddressesRequest,
  GetEndpointsResponse,
};
