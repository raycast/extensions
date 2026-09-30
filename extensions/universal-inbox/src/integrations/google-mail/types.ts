export interface GoogleMailThread {
  id: string;
  user_email_address: string;
  history_id: string;
  messages: Array<GoogleMailMessage>;
}

export interface GoogleMailMessage {
  id: string;
  threadId: string;
  labelIds?: Array<string>;
  snippet: string;
  payload: GoogleMailMessagePayload;
  sizeEstimate: number;
  historyId: string;
  internalDate: Date;
}

export interface GoogleMailMessagePayload {
  mimeType: string;
  headers: Array<GoogleMailMessageHeader>;
}

export interface GoogleMailMessageHeader {
  name: string;
  value: string;
}
