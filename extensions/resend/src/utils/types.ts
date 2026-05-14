import {
  CreateApiKeyOptions,
  CreateContactOptions,
  CreateDomainOptions,
  CreateEmailOptions,
  UpdateContactOptions,
} from "resend";

// API Keys
export type CreateAPIKeyRequestForm = Omit<CreateApiKeyOptions, "permission"> & {
  permission?: string;
};

// Domains
export type AddDomainRequestForm = Omit<CreateDomainOptions, "region"> & {
  region?: string;
};

// Emails
export type SendEmailRequestForm = Omit<CreateEmailOptions, "to" | "bcc" | "cc" | "replyTo" | "attachments"> & {
  to: string;
  bcc?: string;
  cc?: string;
  reply_to?: string;
  attachments?: string[];
};

// Audiences

// Contacts
export type CreateContactRequestForm = CreateContactOptions;
export type UpdateContactRequestForm = UpdateContactOptions & {
  email: string;
};
