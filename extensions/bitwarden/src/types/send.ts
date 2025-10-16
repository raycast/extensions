export type SendCreatePayload = {
  name: string;
  notes?: string | null;
  type: SendType;
  text?: SendText | null;
  file?: SendFile | null;
  maxAccessCount?: number | null;
  deletionDate?: string;
  expirationDate?: string | null;
  password?: string | null;
  disabled?: boolean;
  hideEmail?: boolean;
};

export enum SendType {
  Text = 0,
  File = 1,
}

export type SendText = {
  text: string;
  hidden: boolean;
};

export enum SendDateOption {
  OneHour = "1 hour",
  OneDay = "1 day",
  TwoDays = "2 days",
  ThreeDays = "3 days",
  SevenDays = "7 days",
  ThirtyDays = "30 days",
  Custom = "Custom",
}

export type SendFile = {
  fileName: string;
};

export type Send = {
  object: "send";
  id: string;
  accessId: string;
  accessUrl: string;
  name: string;
  notes: string | null;
  key: string;
  type: SendType;
  text: SendText | null;
  file: SendFile | null;
  maxAccessCount: number | null;
  accessCount: number;
  revisionDate: string;
  deletionDate: string;
  expirationDate: string | null;
  passwordSet: boolean;
  disabled: boolean;
  hideEmail: boolean;
};

type BaseReceivedSend = {
  object: "send-access";
  id: string;
  name: string;
};

export type ReceivedSendFile = {
  id: string;
  size: string;
  sizeName: string;
  fileName: string;
};

export type ReceivedFileSend = BaseReceivedSend & {
  type: SendType.File;
  file: ReceivedSendFile;
};

export type ReceivedTextSend = BaseReceivedSend & {
  type: SendType.Text;
  text: SendText;
};

export type ReceivedSend = ReceivedFileSend | ReceivedTextSend;
