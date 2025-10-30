import * as React from "react";

/**
 * Type definitions for the Inbound Email SDK
 */

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}
interface SuccessResponse<T> {
  data: T;
  error?: never;
}
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
interface IdempotencyOptions {
  idempotencyKey?: string;
}
interface EmailItem {
  id: string;
  emailId: string;
  messageId: string | null;
  subject: string;
  from: string;
  fromName: string | null;
  recipient: string;
  preview: string;
  receivedAt: Date;
  isRead: boolean;
  readAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  hasAttachments: boolean;
  attachmentCount: number;
  parseSuccess: boolean | null;
  parseError: string | null;
  createdAt: Date;
}
interface GetMailRequest {
  limit?: number;
  offset?: number;
  search?: string;
  status?: "all" | "processed" | "failed";
  domain?: string;
  timeRange?: "24h" | "7d" | "30d" | "90d";
  includeArchived?: boolean;
  emailAddress?: string;
  emailId?: string;
}
interface GetMailResponse {
  emails: EmailItem[];
  pagination: Pagination;
}
interface PostMailRequest {
  emailId: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
}
interface PostMailResponse {
  message: string;
}
interface GetMailByIdResponse {
  id: string;
  emailId: string;
  subject: string;
  from: string;
  to: string;
  textBody: string;
  htmlBody: string;
  receivedAt: Date;
  attachments: any[];
}
interface WebhookConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}
interface EmailConfig {
  email: string;
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
interface GetEndpointsRequest {
  limit?: number;
  offset?: number;
  type?: "webhook" | "email" | "email_group";
  active?: "true" | "false";
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
interface GetEndpointByIdResponse {
  id: string;
  name: string;
  type: string;
  config: EndpointConfig;
  isActive: boolean;
  description: string | null;
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
  };
  recentDeliveries: any[];
  associatedEmails: any[];
  catchAllDomains: any[];
  createdAt: Date;
  updatedAt: Date;
}
interface PutEndpointByIdRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  config?: EndpointConfig;
}
interface PutEndpointByIdResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  config: EndpointConfig;
  updatedAt: Date;
}
interface DeleteEndpointByIdResponse {
  message: string;
  cleanup: {
    emailAddressesUpdated: number;
    domainsUpdated: number;
    groupEmailsDeleted: number;
    deliveriesDeleted: number;
    emailAddresses: any[];
    domains: any[];
  };
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
interface GetDomainsRequest {
  limit?: number;
  offset?: number;
  status?: "pending" | "verified" | "failed";
  canReceive?: "true" | "false";
  check?: "true" | "false";
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
interface PostDomainsResponse {
  id: string;
  domain: string;
  status: string;
  dnsRecords: Array<{
    type: string;
    name: string;
    value: string;
  }>;
  createdAt: Date;
}
interface GetDomainByIdResponse {
  id: string;
  domain: string;
  status: string;
  canReceiveEmails: boolean;
  isCatchAllEnabled: boolean;
  catchAllEndpointId: string | null;
  stats: {
    totalEmailAddresses: number;
    activeEmailAddresses: number;
  };
  catchAllEndpoint?: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
interface PutDomainByIdRequest {
  isCatchAllEnabled: boolean;
  catchAllEndpointId: string | null;
}
interface PutDomainByIdResponse {
  id: string;
  domain: string;
  isCatchAllEnabled: boolean;
  catchAllEndpointId: string | null;
  catchAllEndpoint?: {
    id: string;
    name: string;
    type: string;
  } | null;
  updatedAt: Date;
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
    config?: any;
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
interface PostEmailAddressesResponse {
  id: string;
  address: string;
  domainId: string;
  endpointId: string | null;
  isActive: boolean;
  domain: {
    name: string;
  };
  routing: {
    type: "webhook" | "endpoint" | "none";
  };
  createdAt: Date;
}
interface GetEmailAddressByIdResponse {
  id: string;
  address: string;
  domainId: string;
  endpointId: string | null;
  isActive: boolean;
  isReceiptRuleConfigured: boolean;
  domain: {
    name: string;
  };
  routing: {
    type: "webhook" | "endpoint" | "none";
    id: string | null;
    name: string | null;
    config?: any;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
interface PutEmailAddressByIdRequest {
  isActive?: boolean;
  endpointId?: string | null;
  webhookId?: string | null;
}
interface PutEmailAddressByIdResponse {
  id: string;
  address: string;
  isActive: boolean;
  domain: {
    name: string;
  };
  routing: {
    type: "webhook" | "endpoint" | "none";
  };
  updatedAt: Date;
}
interface DeleteEmailAddressByIdResponse {
  message: string;
  cleanup: {
    emailAddress: string;
    domain: string;
    sesRuleUpdated: boolean;
  };
}
/**
 * Enhanced attachment interface supporting both remote and base64 content
 *
 * For embedding images in HTML using Content-ID (CID):
 * 1. Set content_id to a unique identifier (e.g., "logo-image")
 * 2. Reference it in HTML: <img src="cid:logo-image" />
 * 3. The content_id must be less than 128 characters
 *
 * @example
 * // Embed an image in email HTML
 * const attachment = {
 *   content: base64ImageData,
 *   filename: "logo.png",
 *   contentType: "image/png",
 *   content_id: "company-logo"
 * }
 *
 * const html = '<p>Welcome! <img src="cid:company-logo" alt="Company Logo" /></p>'
 */
interface AttachmentData {
  path?: string;
  content?: string;
  filename: string;
  contentType?: string;
  content_id?: string;
}
type ReactEmailComponent = React.ReactElement | React.ComponentType<any>;
interface PostEmailsRequest {
  from: string;
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string | string[];
  html?: string;
  text?: string;
  react?: ReactEmailComponent;
  headers?: Record<string, string>;
  attachments?: AttachmentData[];
  tags?: Array<{
    name: string;
    value: string;
  }>;
  scheduled_at?: string;
  timezone?: string;
}
interface PostEmailsResponse {
  id: string;
  messageId?: string;
  scheduled_at?: string;
  status?: "sent" | "scheduled";
  timezone?: string;
}
interface GetEmailByIdResponse {
  object: string;
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  reply_to: string[];
  subject: string;
  text: string;
  html: string;
  created_at: Date;
  last_event: "pending" | "delivered" | "failed";
}
interface PostEmailReplyRequest {
  from: string;
  from_name?: string;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  attachments?: AttachmentData[];
  tags?: Array<{
    name: string;
    value: string;
  }>;
  includeOriginal?: boolean;
  include_original?: boolean;
  simple?: boolean;
}
interface PostEmailReplyResponse {
  id: string;
  messageId: string;
  awsMessageId: string;
}
interface PostScheduleEmailRequest {
  from: string;
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string | string[];
  html?: string;
  text?: string;
  react?: ReactEmailComponent;
  headers?: Record<string, string>;
  attachments?: AttachmentData[];
  tags?: Array<{
    name: string;
    value: string;
  }>;
  scheduled_at: string;
  timezone?: string;
}
interface PostScheduleEmailResponse {
  id: string;
  scheduled_at: string;
  status: "scheduled";
  timezone: string;
}
interface GetScheduledEmailsRequest {
  limit?: number;
  offset?: number;
  status?: string;
}
interface ScheduledEmailItem {
  id: string;
  from: string;
  to: string[];
  subject: string;
  scheduled_at: string;
  status: string;
  timezone: string;
  created_at: string;
  attempts: number;
  last_error?: string;
}
interface GetScheduledEmailsResponse {
  data: ScheduledEmailItem[];
  pagination: Pagination;
}
interface GetScheduledEmailResponse {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: AttachmentData[];
  tags?: Array<{
    name: string;
    value: string;
  }>;
  scheduled_at: string;
  timezone: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  sent_email_id?: string;
}
interface DeleteScheduledEmailResponse {
  id: string;
  status: "cancelled";
  cancelled_at: string;
}

/**
 * TypeScript types for Inbound Email webhook payloads
 * Use these types to add type safety to your webhook handlers
 */
interface InboundEmailAddress {
  text: string;
  addresses: Array<{
    name: string | null;
    address: string | null;
  }>;
}
interface InboundEmailAttachment {
  filename: string | undefined;
  contentType: string | undefined;
  size: number | undefined;
  contentId: string | undefined;
  contentDisposition: string | undefined;
  downloadUrl: string;
}
interface InboundEmailHeaders extends Record<string, any> {
  "return-path"?: {
    value?:
      | Array<{
          address: string;
          name: string;
        }>
      | string;
    html?: string;
    text?: string;
    params?: Record<string, string>;
  };
  received?: string | string[];
  "received-spf"?: string;
  "authentication-results"?: string;
  "x-ses-receipt"?: string;
  "x-ses-dkim-signature"?: string;
  "dkim-signature"?:
    | Array<{
        value: string;
        params: Record<string, string>;
      }>
    | {
        value?:
          | Array<{
              address: string;
              name: string;
            }>
          | string;
        html?: string;
        text?: string;
        params?: Record<string, string>;
      };
  list?: {
    unsubscribe?: {
      url: string;
    };
    "unsubscribe-post"?: {
      name: string;
    };
  };
  "x-entity-ref-id"?: string;
  from?: {
    value?:
      | Array<{
          address: string;
          name: string;
        }>
      | string;
    html?: string;
    text?: string;
    params?: Record<string, string>;
  };
  to?: {
    value?:
      | Array<{
          address: string;
          name: string;
        }>
      | string;
    html?: string;
    text?: string;
    params?: Record<string, string>;
  };
  subject?: string;
  "message-id"?: string;
  date?: string;
  "mime-version"?: string;
  "content-type"?: {
    value: string;
    params: Record<string, string>;
  };
  "feedback-id"?: string;
  "x-ses-outgoing"?: string;
}
interface InboundParsedEmailData {
  messageId: string | undefined;
  date: Date | undefined;
  subject: string | undefined;
  from: InboundEmailAddress | null;
  to: InboundEmailAddress | null;
  cc: InboundEmailAddress | null;
  bcc: InboundEmailAddress | null;
  replyTo: InboundEmailAddress | null;
  inReplyTo: string | undefined;
  references: string[] | undefined;
  textBody: string | undefined;
  htmlBody: string | undefined;
  raw?: string;
  attachments: InboundEmailAttachment[];
  headers: InboundEmailHeaders;
  priority: string | false | undefined;
}
interface InboundWebhookEmail {
  id: string;
  messageId: string | null;
  from: InboundEmailAddress | null;
  to: InboundEmailAddress | null;
  recipient: string;
  subject: string | null;
  receivedAt: Date | string;
  threadId: string | null;
  threadPosition: number | null;
  parsedData: InboundParsedEmailData;
  cleanedContent: {
    html: string | null;
    text: string | null;
    hasHtml: boolean;
    hasText: boolean;
    attachments: InboundEmailAttachment[];
    headers: InboundEmailHeaders;
  };
}
interface InboundWebhookEndpoint {
  id: string;
  name: string;
  type: "webhook" | "email" | "email_group";
}
interface InboundWebhookPayload {
  event: "email.received";
  timestamp: string;
  email: InboundWebhookEmail;
  endpoint: InboundWebhookEndpoint;
}
interface InboundWebhookHeaders {
  "content-type": "application/json";
  "user-agent": "InboundEmail-Webhook/1.0";
  "x-webhook-event": "email.received";
  "x-endpoint-id": string;
  "x-webhook-timestamp": string;
  "x-email-id": string;
  "x-message-id": string;
  [key: string]: string;
}
interface InboundWebhookRequest {
  method: "POST";
  headers: InboundWebhookHeaders;
  body: InboundWebhookPayload;
}
declare function isInboundWebhook(payload: any): payload is InboundWebhookPayload;
type InboundEmailContent = Pick<InboundWebhookEmail, "subject" | "parsedData" | "cleanedContent">;
type InboundAttachmentInfo = InboundEmailAttachment & {
  hasContent: boolean;
  isImage: boolean;
  isDocument: boolean;
};
declare function getAttachmentInfo(attachment: InboundEmailAttachment): InboundAttachmentInfo;
declare function getEmailText(email: InboundWebhookEmail): string;
declare function getEmailHtml(email: InboundWebhookEmail): string;
declare function getSenderInfo(email: InboundWebhookEmail): {
  name: string | null;
  address: string | null;
};
declare function getRecipientAddresses(email: InboundWebhookEmail): string[];

/**
 * Main client class for the Inbound Email SDK
 */

declare class InboundEmailClient {
  private readonly apiKey;
  private readonly baseUrl;
  constructor(apiKey: string, baseUrl?: string);
  /**
   * Make an authenticated request to the API with { data, error } response pattern
   */
  private request;
  /**
   * Process React component in email request
   * Converts React component to HTML and adds it to the request
   */
  private processReactComponent;
  /**
   * Mail API - for managing received emails (inbound)
   * @deprecated Use `email.received` instead. This will be removed in a future version.
   */
  mail: {
    /**
     * List all emails in the mailbox
     * @deprecated Use `email.received.list()` instead
     */
    list: (params?: GetMailRequest) => Promise<ApiResponse<GetMailResponse>>;
    /**
     * Get a specific email by ID
     * @deprecated Use `email.received.get()` instead
     */
    get: (id: string) => Promise<ApiResponse<GetMailByIdResponse>>;
    /**
     * Get email thread/conversation by email ID
     * @deprecated Use `email.received.thread()` instead
     */
    thread: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Mark email as read
     * @deprecated Use `email.received.markRead()` instead
     */
    markRead: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Mark email as unread
     * @deprecated Use `email.received.markUnread()` instead
     */
    markUnread: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Archive email
     * @deprecated Use `email.received.archive()` instead
     */
    archive: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Unarchive email
     * @deprecated Use `email.received.unarchive()` instead
     */
    unarchive: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Reply to an email
     * @deprecated Use `email.received.reply()` instead
     */
    reply: (params: PostMailRequest) => Promise<ApiResponse<PostMailResponse>>;
    /**
     * Bulk operations on multiple emails
     * @deprecated Use `email.received.bulk()` instead
     */
    bulk: (
      emailIds: string[],
      updates: {
        isRead?: boolean;
        isArchived?: boolean;
      },
    ) => Promise<ApiResponse<any>>;
  };
  /**
   * Email API - Unified interface for managing all emails (received and sent)
   */
  email: {
    /**
     * Send an email with optional attachments
     * Supports both remote files (path) and base64 content
     * Also supports React components for email content
     * If scheduled_at is provided, the email will be scheduled for future delivery
     */
    send: (params: PostEmailsRequest, options?: IdempotencyOptions) => Promise<ApiResponse<PostEmailsResponse>>;
    /**
     * Get an email by ID - works for both received and sent emails
     * For received emails, use received.get() for better type safety
     * For sent emails, use sent.get() for better type safety
     */
    get: (id: string) => Promise<ApiResponse<GetMailByIdResponse | GetEmailByIdResponse>>;
    /**
     * Received emails API - for managing inbound emails
     */
    received: {
      /**
       * List all received emails in the mailbox
       */
      list: (params?: GetMailRequest) => Promise<ApiResponse<GetMailResponse>>;
      /**
       * Get a specific received email by ID
       */
      get: (id: string) => Promise<ApiResponse<GetMailByIdResponse>>;
      /**
       * Get email thread/conversation by email ID
       */
      thread: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Mark received email as read
       */
      markRead: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Mark received email as unread
       */
      markUnread: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Archive received email
       */
      archive: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Unarchive received email
       */
      unarchive: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Reply to a received email
       */
      reply: (params: PostMailRequest) => Promise<ApiResponse<PostMailResponse>>;
      /**
       * Bulk operations on multiple received emails
       */
      bulk: (
        emailIds: string[],
        updates: {
          isRead?: boolean;
          isArchived?: boolean;
        },
      ) => Promise<ApiResponse<any>>;
    };
    /**
     * Sent emails API - for managing outbound emails
     */
    sent: {
      /**
       * Get a sent email by ID
       */
      get: (id: string) => Promise<ApiResponse<GetEmailByIdResponse>>;
      /**
       * Reply to a sent email by ID with optional attachments
       */
      reply: (
        id: string,
        params: PostEmailReplyRequest,
        options?: IdempotencyOptions,
      ) => Promise<ApiResponse<PostEmailReplyResponse>>;
      /**
       * List scheduled emails with filtering and pagination
       */
      listScheduled: (params?: GetScheduledEmailsRequest) => Promise<ApiResponse<GetScheduledEmailsResponse>>;
      /**
       * Get details of a specific scheduled email
       */
      getScheduled: (id: string) => Promise<ApiResponse<GetScheduledEmailResponse>>;
      /**
       * Cancel a scheduled email (only works if status is 'scheduled')
       */
      cancel: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    };
    /**
     * Reply to an email by ID with optional attachments (DEPRECATED - use sent.reply() instead)
     * @deprecated Use `sent.reply()` instead
     */
    reply: (
      id: string,
      params: PostEmailReplyRequest,
      options?: IdempotencyOptions,
    ) => Promise<ApiResponse<PostEmailReplyResponse>>;
    /**
     * Schedule an email to be sent at a future time
     * Supports both ISO 8601 dates and natural language (e.g., "in 1 hour", "tomorrow at 9am")
     * @deprecated This method will remain at the top level for backward compatibility
     */
    schedule: (
      params: PostScheduleEmailRequest,
      options?: IdempotencyOptions,
    ) => Promise<ApiResponse<PostScheduleEmailResponse>>;
    /**
     * List scheduled emails with filtering and pagination
     * @deprecated Use sent.listScheduled() instead
     */
    listScheduled: (params?: GetScheduledEmailsRequest) => Promise<ApiResponse<GetScheduledEmailsResponse>>;
    /**
     * Get details of a specific scheduled email
     * @deprecated Use sent.getScheduled() instead
     */
    getScheduled: (id: string) => Promise<ApiResponse<GetScheduledEmailResponse>>;
    /**
     * Cancel a scheduled email (only works if status is 'scheduled')
     * @deprecated Use sent.cancel() instead
     */
    cancel: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    /**
     * @deprecated Use sent.cancel() instead
     * Cancel a scheduled email (only works if status is 'scheduled')
     */
    cancelScheduled: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    /**
     * Email Address Management - nested under email
     */
    address: {
      /**
       * Create a new email address
       */
      create: (params: PostEmailAddressesRequest) => Promise<ApiResponse<PostEmailAddressesResponse>>;
      /**
       * List all email addresses
       */
      list: (params?: GetEmailAddressesRequest) => Promise<ApiResponse<GetEmailAddressesResponse>>;
      /**
       * Get a specific email address by ID
       */
      get: (id: string) => Promise<ApiResponse<GetEmailAddressByIdResponse>>;
      /**
       * Update an email address
       */
      update: (id: string, params: PutEmailAddressByIdRequest) => Promise<ApiResponse<PutEmailAddressByIdResponse>>;
      /**
       * Delete an email address
       */
      delete: (id: string) => Promise<ApiResponse<DeleteEmailAddressByIdResponse>>;
    };
  };
  /**
   * Domains API - for managing email domains
   */
  domain: {
    /**
     * Create a new domain
     */
    create: (params: PostDomainsRequest) => Promise<ApiResponse<PostDomainsResponse>>;
    /**
     * List all domains
     */
    list: (params?: GetDomainsRequest) => Promise<ApiResponse<GetDomainsResponse>>;
    /**
     * Get a specific domain by ID
     */
    get: (id: string) => Promise<ApiResponse<GetDomainByIdResponse>>;
    /**
     * Update domain settings (catch-all configuration)
     */
    update: (id: string, params: PutDomainByIdRequest) => Promise<ApiResponse<PutDomainByIdResponse>>;
    /**
     * Delete a domain
     */
    delete: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Initiate domain verification
     */
    verify: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Get DNS records required for domain verification
     */
    getDnsRecords: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Check domain verification status
     */
    checkStatus: (id: string) => Promise<ApiResponse<any>>;
  };
  /**
   * Endpoints API - for managing webhook and email endpoints
   */
  endpoint: {
    /**
     * Create a new endpoint
     */
    create: (params: PostEndpointsRequest) => Promise<ApiResponse<PostEndpointsResponse>>;
    /**
     * List all endpoints
     */
    list: (params?: GetEndpointsRequest) => Promise<ApiResponse<GetEndpointsResponse>>;
    /**
     * Get a specific endpoint by ID
     */
    get: (id: string) => Promise<ApiResponse<GetEndpointByIdResponse>>;
    /**
     * Update an endpoint
     */
    update: (id: string, params: PutEndpointByIdRequest) => Promise<ApiResponse<PutEndpointByIdResponse>>;
    /**
     * Delete an endpoint
     */
    delete: (id: string) => Promise<ApiResponse<DeleteEndpointByIdResponse>>;
    /**
     * Test endpoint connectivity
     */
    test: (id: string) => Promise<ApiResponse<any>>;
  };
  /**
   * Convenience Methods - Simplified Common Operations
   */
  /**
   * Quick text reply to an email
   */
  quickReply: (
    emailId: string,
    message: string,
    from: string,
    options?: IdempotencyOptions,
  ) => Promise<ApiResponse<PostEmailReplyResponse>>;
  /**
   * One-step domain setup with webhook
   */
  setupDomain: (domain: string, webhookUrl?: string) => Promise<ApiResponse<any>>;
  /**
   * Simple email forwarding setup
   */
  createForwarder: (from: string, to: string) => Promise<ApiResponse<any>>;
  /**
   * Quick scheduled email reminder
   */
  scheduleReminder: (
    to: string,
    subject: string,
    when: string,
    from: string,
    options?: IdempotencyOptions,
  ) => Promise<ApiResponse<PostScheduleEmailResponse>>;
  /**
   * Legacy compatibility methods
   */
  /**
   * @deprecated Use email.send() instead
   * Legacy send method for backwards compatibility
   */
  send: (params: PostEmailsRequest, options?: IdempotencyOptions) => Promise<ApiResponse<PostEmailsResponse>>;
  /**
   * Streamlined reply method for webhook handlers
   * Works directly with webhook email objects for better DX
   *
   * Usage:
   * - const { data, error } = await inbound.reply("email-id", { from: "support@domain.com", text: "Thanks!" })
   * - const { data, error } = await inbound.reply(email, { from: "support@domain.com", text: "Thanks!" })
   */
  reply: (
    emailOrId: InboundWebhookEmail | string,
    replyParams: PostEmailReplyRequest,
    options?: IdempotencyOptions,
  ) => Promise<ApiResponse<PostEmailReplyResponse>>;
  domains: {
    /**
     * Create a new domain
     */
    create: (params: PostDomainsRequest) => Promise<ApiResponse<PostDomainsResponse>>;
    /**
     * List all domains
     */
    list: (params?: GetDomainsRequest) => Promise<ApiResponse<GetDomainsResponse>>;
    /**
     * Get a specific domain by ID
     */
    get: (id: string) => Promise<ApiResponse<GetDomainByIdResponse>>;
    /**
     * Update domain settings (catch-all configuration)
     */
    update: (id: string, params: PutDomainByIdRequest) => Promise<ApiResponse<PutDomainByIdResponse>>;
    /**
     * Delete a domain
     */
    delete: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Initiate domain verification
     */
    verify: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Get DNS records required for domain verification
     */
    getDnsRecords: (id: string) => Promise<ApiResponse<any>>;
    /**
     * Check domain verification status
     */
    checkStatus: (id: string) => Promise<ApiResponse<any>>;
  };
  endpoints: {
    /**
     * Create a new endpoint
     */
    create: (params: PostEndpointsRequest) => Promise<ApiResponse<PostEndpointsResponse>>;
    /**
     * List all endpoints
     */
    list: (params?: GetEndpointsRequest) => Promise<ApiResponse<GetEndpointsResponse>>;
    /**
     * Get a specific endpoint by ID
     */
    get: (id: string) => Promise<ApiResponse<GetEndpointByIdResponse>>;
    /**
     * Update an endpoint
     */
    update: (id: string, params: PutEndpointByIdRequest) => Promise<ApiResponse<PutEndpointByIdResponse>>;
    /**
     * Delete an endpoint
     */
    delete: (id: string) => Promise<ApiResponse<DeleteEndpointByIdResponse>>;
    /**
     * Test endpoint connectivity
     */
    test: (id: string) => Promise<ApiResponse<any>>;
  };
  emailAddresses: {
    /**
     * Create a new email address
     */
    create: (params: PostEmailAddressesRequest) => Promise<ApiResponse<PostEmailAddressesResponse>>;
    /**
     * List all email addresses
     */
    list: (params?: GetEmailAddressesRequest) => Promise<ApiResponse<GetEmailAddressesResponse>>;
    /**
     * Get a specific email address by ID
     */
    get: (id: string) => Promise<ApiResponse<GetEmailAddressByIdResponse>>;
    /**
     * Update an email address
     */
    update: (id: string, params: PutEmailAddressByIdRequest) => Promise<ApiResponse<PutEmailAddressByIdResponse>>;
    /**
     * Delete an email address
     */
    delete: (id: string) => Promise<ApiResponse<DeleteEmailAddressByIdResponse>>;
  };
  emails: {
    /**
     * Send an email with optional attachments
     * Supports both remote files (path) and base64 content
     * Also supports React components for email content
     * If scheduled_at is provided, the email will be scheduled for future delivery
     */
    send: (params: PostEmailsRequest, options?: IdempotencyOptions) => Promise<ApiResponse<PostEmailsResponse>>;
    /**
     * Get an email by ID - works for both received and sent emails
     * For received emails, use received.get() for better type safety
     * For sent emails, use sent.get() for better type safety
     */
    get: (id: string) => Promise<ApiResponse<GetMailByIdResponse | GetEmailByIdResponse>>;
    /**
     * Received emails API - for managing inbound emails
     */
    received: {
      /**
       * List all received emails in the mailbox
       */
      list: (params?: GetMailRequest) => Promise<ApiResponse<GetMailResponse>>;
      /**
       * Get a specific received email by ID
       */
      get: (id: string) => Promise<ApiResponse<GetMailByIdResponse>>;
      /**
       * Get email thread/conversation by email ID
       */
      thread: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Mark received email as read
       */
      markRead: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Mark received email as unread
       */
      markUnread: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Archive received email
       */
      archive: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Unarchive received email
       */
      unarchive: (id: string) => Promise<ApiResponse<any>>;
      /**
       * Reply to a received email
       */
      reply: (params: PostMailRequest) => Promise<ApiResponse<PostMailResponse>>;
      /**
       * Bulk operations on multiple received emails
       */
      bulk: (
        emailIds: string[],
        updates: {
          isRead?: boolean;
          isArchived?: boolean;
        },
      ) => Promise<ApiResponse<any>>;
    };
    /**
     * Sent emails API - for managing outbound emails
     */
    sent: {
      /**
       * Get a sent email by ID
       */
      get: (id: string) => Promise<ApiResponse<GetEmailByIdResponse>>;
      /**
       * Reply to a sent email by ID with optional attachments
       */
      reply: (
        id: string,
        params: PostEmailReplyRequest,
        options?: IdempotencyOptions,
      ) => Promise<ApiResponse<PostEmailReplyResponse>>;
      /**
       * List scheduled emails with filtering and pagination
       */
      listScheduled: (params?: GetScheduledEmailsRequest) => Promise<ApiResponse<GetScheduledEmailsResponse>>;
      /**
       * Get details of a specific scheduled email
       */
      getScheduled: (id: string) => Promise<ApiResponse<GetScheduledEmailResponse>>;
      /**
       * Cancel a scheduled email (only works if status is 'scheduled')
       */
      cancel: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    };
    /**
     * Reply to an email by ID with optional attachments (DEPRECATED - use sent.reply() instead)
     * @deprecated Use `sent.reply()` instead
     */
    reply: (
      id: string,
      params: PostEmailReplyRequest,
      options?: IdempotencyOptions,
    ) => Promise<ApiResponse<PostEmailReplyResponse>>;
    /**
     * Schedule an email to be sent at a future time
     * Supports both ISO 8601 dates and natural language (e.g., "in 1 hour", "tomorrow at 9am")
     * @deprecated This method will remain at the top level for backward compatibility
     */
    schedule: (
      params: PostScheduleEmailRequest,
      options?: IdempotencyOptions,
    ) => Promise<ApiResponse<PostScheduleEmailResponse>>;
    /**
     * List scheduled emails with filtering and pagination
     * @deprecated Use sent.listScheduled() instead
     */
    listScheduled: (params?: GetScheduledEmailsRequest) => Promise<ApiResponse<GetScheduledEmailsResponse>>;
    /**
     * Get details of a specific scheduled email
     * @deprecated Use sent.getScheduled() instead
     */
    getScheduled: (id: string) => Promise<ApiResponse<GetScheduledEmailResponse>>;
    /**
     * Cancel a scheduled email (only works if status is 'scheduled')
     * @deprecated Use sent.cancel() instead
     */
    cancel: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    /**
     * @deprecated Use sent.cancel() instead
     * Cancel a scheduled email (only works if status is 'scheduled')
     */
    cancelScheduled: (id: string) => Promise<ApiResponse<DeleteScheduledEmailResponse>>;
    /**
     * Email Address Management - nested under email
     */
    address: {
      /**
       * Create a new email address
       */
      create: (params: PostEmailAddressesRequest) => Promise<ApiResponse<PostEmailAddressesResponse>>;
      /**
       * List all email addresses
       */
      list: (params?: GetEmailAddressesRequest) => Promise<ApiResponse<GetEmailAddressesResponse>>;
      /**
       * Get a specific email address by ID
       */
      get: (id: string) => Promise<ApiResponse<GetEmailAddressByIdResponse>>;
      /**
       * Update an email address
       */
      update: (id: string, params: PutEmailAddressByIdRequest) => Promise<ApiResponse<PutEmailAddressByIdResponse>>;
      /**
       * Delete an email address
       */
      delete: (id: string) => Promise<ApiResponse<DeleteEmailAddressByIdResponse>>;
    };
  };
}

/**
 * Utility functions for the Inbound Email SDK
 */
/**
 * Check if a string is a valid email address
 */
declare function isValidEmail(email: string): boolean;
/**
 * Build query string from parameters
 */
declare function buildQueryString(params: Record<string, any>): string;

interface DNSRecord {
  id: string;
  recordType: string;
  name: string;
  value: string;
}
interface GetDNSRecordsResponse {
  records: DNSRecord[];
}
interface Thread {
    "id": string
    "rootMessageId": string
    "normalizedSubject": string
    "participantEmails": string[]
      "messageCount": number
      "lastMessageAt":string
      "createdAt":string
      "latestMessage": {
        "id": string
        "type": "inbound" | "outbound"
        "subject": string
        "fromText":string
        "textPreview": string
        "isRead": boolean
        "hasAttachments": boolean
        "date": string
      },
      "hasUnread": boolean
      "isArchived": boolean
}
interface GetThreadsResponse {
    threads: Thread[]
  pagination: Pagination;
}

export {
  type ApiResponse,
  type AttachmentData,
  type DeleteScheduledEmailResponse,
  type ErrorResponse,
  type GetScheduledEmailResponse,
  type GetScheduledEmailsRequest,
  type GetScheduledEmailsResponse,
  type IdempotencyOptions,
  InboundEmailClient as Inbound,
  type InboundAttachmentInfo,
  type InboundEmailAddress,
  type InboundEmailAttachment,
  InboundEmailClient,
  type InboundEmailContent,
  type InboundEmailHeaders,
  type InboundParsedEmailData,
  type InboundWebhookEmail,
  type InboundWebhookEndpoint,
  type InboundWebhookHeaders,
  type InboundWebhookPayload,
  type InboundWebhookRequest,
  type PostEmailReplyRequest,
  type PostEmailReplyResponse,
  type PostEmailsRequest,
  type PostEmailsResponse,
  type PostScheduleEmailRequest,
  type PostScheduleEmailResponse,
  type ReactEmailComponent,
  type ScheduledEmailItem,
  type SuccessResponse,
  VERSION,
  buildQueryString,
  InboundEmailClient as default,
  getAttachmentInfo,
  getEmailHtml,
  getEmailText,
  getRecipientAddresses,
  getSenderInfo,
  isInboundWebhook,
  isValidEmail,
};
export type {
  GetDomainsResponse,
  DomainWithStats,
  PostDomainsRequest,
  GetEmailAddressesResponse,
  PostEmailAddressesRequest,
  EmailAddressWithDomain,
  GetDNSRecordsResponse,
  GetEmailAddressesRequest,
  GetThreadsResponse,
};
