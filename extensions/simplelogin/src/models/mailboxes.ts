export type Mailboxes = {
  creation_timestamp: number;
  default: boolean;
  email: string;
  id: number;
  nb_alias: number;
  verified: boolean;
};

export type MailboxesResponse = {
  mailboxes: Mailboxes[];
};
