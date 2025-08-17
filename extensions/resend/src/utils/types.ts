// API Keys
export type APIKey = {
  id: string;
  name: string;
  created_at: string;
};
export type GetAPIKeysResponse = {
  data: APIKey[];
};
export type CreateAPIKeyRequest = {
  name: string;
  permission?: "full_access" | "sending_access";
  domain_id?: string;
};
export type CreateAPIKeyRequestForm = {
  name: string;
  permission?: string;
  domain_id?: string;
};
export type CreateAPIKeyResponse = {
  id: string;
  token: string;
};

// Domains
export type Domain = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  region: string;
};
export type GetDomainsResponse = {
  data: Domain[];
};
export type AddDomainRequest = {
  name: string;
  region?: "us-east-1" | "eu-west-1" | "sa-east-1" | "ap-northeast-1";
};
export type AddDomainRequestForm = {
  name: string;
  region?: string;
};
type DNSRecord = {
  record: string;
  name: string;
  type: string;
  ttl: string;
  status: string;
  value: string;
  priority?: number;
};
export type AddDomainResponse = Domain & {
  dnsProvider?: string;
  records: DNSRecord[];
};
export type VerifyDomainResponse = {
  object: "domain";
  id: string;
};

// Emails
export type GetEmailResponse = {
  object: "email";
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html: string | null;
  text: string | null;
  bcc: string[] | [null];
  cc: string[] | [null];
  reply_to: string[] | [null];
  last_event: "sent" | "delivered" | "bounced" | "complained";
};

export type EmailAttachment = {
  content?: Buffer | string;
  filename: string;
  path?: string;
};
export type EmailTag = {
  name: string;
  value: string;
};
export type SendEmailRequest = {
  from: string;
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  reply_to?: string | string[];
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  tags?: EmailTag[];
};
export type SendEmailRequestForm = {
  from: string;
  to: string;
  subject: string;
  bcc?: string;
  cc?: string;
  reply_to?: string;
  html?: string;
  text?: string;
  attachments?: string[];
};
export type SendEmailResponse = {
  id: string;
  from: string;
  to: string;
  created_at: string;
};

// Audiences
export type Audience = {
  object: "audience";
  id: string;
  name: string;
  created_at: string;
};

export type GetAudiencesResponse = {
  data: Audience[];
};

// Contacts
export type Contact = {
  obect: "contact";
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  unsubscribed: boolean;
};

export type GetContactsResponse = {
  data: Contact[];
};

export type CreateContactRequestForm = {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
};

export type CreateContactRequest = {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
};

export type CreateContactResponse = Contact;

export type UpdateContactRequestForm = {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
};

export type UpdateContactRequest = {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
};

export type UpdateContactResponse = Contact;

export type ErrorResponse = {
  statusCode: number;
  message: string;
  name: string;
};

export type APIMethod = "GET" | "POST" | "DELETE" | "PATCH";

export type BodyRequest = CreateAPIKeyRequest | SendEmailRequest | CreateContactRequest;
