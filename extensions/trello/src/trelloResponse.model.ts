export type TrelloFetchResponse = TrelloCard[];

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  url: string;
  shortUrl?: string;
  due?: string;
  dueComplete?: boolean;
  idBoard: string;
  idList: string;
  labels?: Label[];
  members?: TrelloMember[];
}

export interface TrelloCardDetails extends TrelloCard {
  attachments?: Attachment[];
  checklists?: Checklist[];
}

export interface Label {
  id?: string;
  name: string;
  color?: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  bytes?: number;
  date: string;
}

export interface Checklist {
  id: string;
  name: string;
  checkItems: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
}
