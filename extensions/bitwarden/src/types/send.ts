export enum SendType {
  Text = 0,
  File = 1,
}

export type SendText = {
  text: string;
  hidden?: false;
};

export type SendPayload = {
  name: string;
  notes?: string;
  type: 0;
  text: SendText;
  file?: string | null;
  maxAccessCount?: number | null;
  deletionDate?: string | null;
  expirationDate?: string | null;
  password?: string | null;
  disabled?: boolean;
  hideEmail?: boolean;
};

export type Send = {
  object: "send";
  id: string;
  accessId: string;
  accessUrl: string;
  name: string;
  notes: string | null;
  key: string;
  type: SendText;
  maxAccessCount: number | null;
  accessCount: number;
  revisionDate: string;
  deletionDate: string;
  expirationDate: string | null;
  passwordSet: boolean;
  disabled: boolean;
  hideEmail: boolean;
  text: SendText;
};
