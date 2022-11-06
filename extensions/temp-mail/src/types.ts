export interface RegisterRes {
  id: string;
  address: string;
  quota: number;
  used: number;
  isDisable: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountResult = RegisterRes;

export interface LoginRes {
  token: string;
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeleteRes {}

export interface DomainRes {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesRes {
  id: string;
  accountId: string;
  msgid: string;
  from: {
    address: string;
    name: string;
  };
  to: {
    address: string;
    name: string;
  };
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRes extends MessagesRes {
  cc: string[];
  bcc: string[];
  flagged: boolean;
  isDeleted: boolean;
  verifications: string[];
  retention: boolean;
  retentionDate: string;
  text: string;
  html: string[];
  attachments: Attachment[];
  size: number;
}

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  size: number;
  downloadUrl: string;
}

export type CreateOneAccountResult = Promise<
  | DomainRes
  | RegisterRes
  | LoginRes
  | {
      status: boolean;
      data: {
        username: string;
        password: string;
        token: string;
        id: string;
      };
    }
>;
