export enum SendType {
  Text = 0,
  File = 1,
}

export type SendText = {
  text: string;
  hidden: false;
};

export type Send = {
  name: string;
  notes?: string;
  type: 0;
  text: SendText;
  file?: null;
  maxAccessCount?: null;
  deletionDate?: string;
  expirationDate?: null;
  password?: null;
  disabled?: false;
  hideEmail?: false;
};
