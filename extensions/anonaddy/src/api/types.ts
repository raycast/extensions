import type { Brand } from "utility-types";

type Alias = {
  /**
   * If true, the alias is enabled and can receive emails.
   */
  active: boolean;
  /**
   * Unknown
   */
  aliasable_id: null;
  /**
   * Unknown
   */
  aliasable_type: null;
  /**
   * The date and time when the alias was created.
   */
  created_at: string;
  /**
   * The date and time when the alias was deleted. Null if not deleted.
   */
  deleted_at: string | null;
  /**
   * The description of the alias.
   */
  description: string | null;
  /**
   * The domain of the alias.
   */
  domain: Domain;
  /**
   * The email address of the alias.
   */
  email: Email;
  /**
   * The number of emails blocked by the alias.
   */
  emails_blocked: number;
  /**
   * The number of emails forwarded by the alias.
   */
  emails_forwarded: number;
  /**
   * The number of emails replied to by the alias.
   */
  emails_replied: number;
  /**
   * The number of emails sent by the alias.
   */
  emails_sent: number;
  /**
   * Unknown
   */
  extension: null;
  /**
   * The 'From Name' is shown when you send an email from an alias or reply
   * anonymously to a forwarded email. If left blank, then the email alias
   * itself will be used as the 'From Name' e.g. "oyj9hyd8@brick.email".
   */
  from_name: null;
  /**
   * ID of the alias.
   */
  id: string;
  /**
   * The part of the email address before the '@' symbol.
   */
  local_part: string;
  /**
   * Recipients of the alias when emails are forwarded. This array is empty
   * if no other recipient than the default is set.
   */
  recipients: Recipient[];
  /**
   * The date and time when the alias was last updated.
   */
  updated_at: string;
  /**
   * The ID of the user who owns the alias.
   */
  user_id: string;
};

type Domain = Brand<string, "domain">;

type Email = Brand<string, "email">;

/**
 * Alias format
 *
 * Don't have any idea of what are the parameters for each one but:
 * - custom: as it says, you need to provide local_part
 * - random_characters: it will generate a random string (e.g.: tzqzkoyd)
 * - random_words: words strung together (e.g.: agility.thinner907)
 * - uuid: following the UUID format (e.g.: 12d9239e-8b63-498f-902c-10322f3e58e5)
 *
 * @see https://app.addy.io/docs/#aliases-POSTapi-v1-aliases
 */
type Format = "custom" | "random_characters" | "random_words" | "uuid";

type Link = Brand<string, "url">;

type Options = {
  /**
   * All available domains
   */
  data: Domain[];
  /**
   * Shared domains
   */
  sharedDomains: Domain[];
  /**
   * Default alias domain
   */
  defaultAliasDomain: Domain;
  /**
   * Default alias format
   */
  defaultAliasFormat: Format;
};

type Paginated<T> = Resource<T[]> & {
  links: {
    first: Link;
    last: Link;
    next: Link | null;
    prev: Link | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: {
      url: Link | null;
      label: string;
      active: boolean;
    }[];
    path: Link;
    per_page: number;
    to: number;
    total: number;
  };
};

type Recipient = {
  /**
   * The number of aliases associated with the recipient.
   */
  aliases_count: number;
  /**
   * If true, whether this recipient is allowed to reply and send from your aliases.
   */
  can_reply_send: boolean;
  /**
   * The date and time when the recipient was created.
   */
  created_at: string;
  /**
   * The email address of the recipient.
   */
  email: Email;
  /**
   * The date and time when the recipient's email was verified. Null if not verified.
   */
  email_verified_at: string | null;
  /**
   * The fingerprint of the recipient's PGP key. Null if no PGP key is set.
   */
  fingerprint: string | null;
  /**
   * ID of the recipient.
   */
  id: string;
  /**
   * If true, Enabling this option will use (PGP/Inline) instead of the default PGP/MIME encryption for forwarded messages.
   */
  inline_encryption: boolean;
  /**
   * If true, whether the recipient's email is verified.
   */
  protected_headers: boolean;
  /**
   * If true, encryption is enabled for the recipient.
   */
  should_encrypt: boolean;
  /**
   * The date and time when the recipient was last updated.
   */
  updated_at: string;
  /**
   * ID of the user who owns the recipient.
   */
  user_id: string;
};

type Resource<T> = {
  data: T;
};

export type { Alias, Domain, Email, Format, Options, Paginated, Recipient, Resource };
