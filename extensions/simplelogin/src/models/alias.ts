export type AliasResponse = {
  alias: string;
  creation_date: string;
  creation_timestamp: number;
  disable_pgp: boolean;
  email: string;
  enabled: boolean;
  id: number;
  latest_activity: string | null;
  mailbox: MailboxesResponse;
  mailboxes: MailboxesResponse[];
  name: string | null;
  nb_block: number;
  nb_forward: number;
  nb_reply: number;
  note: string | null;
  pinned: boolean;
  support_pgp: boolean;
};

export type MailboxesResponse = {
  email: string;
  id: number;
};

export type LoadAllAliasResponse = {
  aliases: AliasResponse[] | [];
};
