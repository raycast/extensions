// MAILBOXES
export type Mailbox = {
  address: string;
  autorespond_active: boolean;
  autorespond_body: string;
  autorespond_expires_on: string;
  autorespond_subject: string;
  changed_at: string;
  delegations: string[];
  domain_name: string;
  expireable: boolean;
  expires_on: string;
  footer_active: boolean;
  footer_html_body: string;
  footer_plain_body: string;
  forwardings: string[];
  identities: Identity[];
  is_internal: boolean;
  last_login_at: string;
  local_part: string;
  may_access_imap: boolean;
  may_access_managesieve: boolean;
  may_access_pop3: boolean;
  may_receive: boolean;
  may_send: boolean;
  name: string;
  password_recovery_email: string;
  recipient_denylist: string[];
  remove_upon_expiry: boolean;
  sender_allowlist: string[];
  sender_denylist: string[];
  spam_action: string;
  spam_aggressiveness: string;
  storage_usage: number;
};
export type FormMailboxCreate = {
  name: string;
  local_part: string;
  password: string;
  password_method: string;
  password_recovery_email: string;
  is_internal: boolean;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  spam_action: string;
  spam_aggressiveness: string;
  sender_denylist: string;
  sender_allowlist: string;
  recipient_denylist: string;
  autorespond_active: boolean;
  autorespond_subject: string;
  autorespond_body: string;
  autorespond_expires_on: Date | null;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};
export type MailboxCreate = {
  name: string;
  local_part: string;
  password: string;
  password_method: string;
  password_recovery_email: string;
  is_internal: boolean;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  spam_action: string;
  spam_aggressiveness: string;
  sender_denylist: string;
  sender_allowlist: string;
  recipient_denylist: string;
  autorespond_active: boolean;
  autorespond_subject: string;
  autorespond_body: string;
  autorespond_expires_on: string | null;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};
export type FormMailboxEdit = {
  name: string;
  is_internal: boolean;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  spam_action: string;
  spam_aggressiveness: string;
  sender_denylist: string;
  sender_allowlist: string;
  recipient_denylist: string;
  autorespond_active: boolean;
  autorespond_subject: string;
  autorespond_body: string;
  autorespond_expires_on: Date | null;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};
export type MailboxEdit = {
  name: string;
  is_internal: boolean;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  spam_action: string;
  spam_aggressiveness: string;
  sender_denylist: string;
  sender_allowlist: string;
  recipient_denylist: string;
  autorespond_active: boolean;
  autorespond_subject: string;
  autorespond_body: string;
  autorespond_expires_on: string | null;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};

// IDENTITIES
export type Identity = {
  local_part: string;
  domain_name: string;
  address: string;
  name: string;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};
export type IdentityCreate = {
  local_part: string;
  name: string;
  password?: string;
  footer_active: boolean;
  footer_plain_body: string;
  footer_html_body: string;
};
export type IdentityEdit = {
  name?: string;
  may_send: boolean;
  may_receive: boolean;
  may_access_imap: boolean;
  may_access_pop3: boolean;
  may_access_managesieve: boolean;
  password?: string;
  footer_active: boolean;
  footer_plain_body?: string;
  footer_html_body?: string;
};

// ALIASES
export type Alias = {
  address: string;
  destinations: string[];
  domain_name: string;
  expireable: boolean;
  expires_on: string;
  is_internal: boolean;
  local_part: string;
  remove_upon_expiry: boolean;
};
export type AliasCreate = {
  local_part: string;
  destinations: string;
  is_internal: boolean;
  expireable: boolean;
  expires_on: string | null;
  remove_upon_expiry: boolean;
};
export type FormAliasCreate = {
  local_part: string;
  destinations: string;
  is_internal: boolean;
  expireable: boolean;
  expires_on: Date | null;
  remove_upon_expiry: boolean;
};
export type AliasEdit = {
  is_internal: boolean;
  destinations: string;
  expireable: boolean;
  expires_on: string | null;
  remove_upon_expiry: boolean;
};
export type FormAliasEdit = {
  is_internal: boolean;
  destinations: string;
  expireable: boolean;
  expires_on: Date | null;
  remove_upon_expiry: boolean;
};

// REWRITES
export type Rewrite = {
  destinations: string[];
  local_part_rule: string;
  name: string;
  order_num: number;
};
export type RewriteCreate = {
  name: string;
  local_part_rule: string;
  destinations: string;
};
export type RewriteEdit = {
  name: string;
  local_part_rule: string;
  destinations: string;
};

export type BodyRequest =
  | MailboxCreate
  | MailboxEdit
  | IdentityCreate
  | IdentityEdit
  | AliasCreate
  | AliasEdit
  | RewriteCreate
  | RewriteEdit;
export type ErrorResponse = {
  error: string;
};

export type APIMethod = "GET" | "POST" | "PUT" | "DELETE";
