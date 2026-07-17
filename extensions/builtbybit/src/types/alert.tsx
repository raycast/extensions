export interface Alert {
  caused_member_id: number;
  content_type: string;
  content_id: ContentType | string;
  alert_type: AlertType | string;
  alert_date: number;
  username?: string;
  read?: boolean;
}

export interface AlertResponse {
  data: Alert[];
}

export enum AlertType {
  REACTION = "reaction",
  REPLY = "insert",
  TICKET_MOVED = "nf_tickets_moved",
  MENTION = "mention",
  EDIT = "edit",
}

export enum ContentType {
  CONVERSATION = "conversation_message",
  TICKET = "nf_tickets_message",
  THREAD = "post",
  REPORT = "report_comment",
  WIKI = "ewr_carta_page",
}

export const ContentTypeURLMap: { [key in ContentType]: string } = {
  [ContentType.CONVERSATION]: "https://builtbybit.com/conversations/messages",
  [ContentType.TICKET]: "https://builtbybit.com/tickets/messages",
  [ContentType.THREAD]: "https://builtbybit.com/posts",
  [ContentType.REPORT]: "https://builtbybit.com/reports/comment",
  [ContentType.WIKI]: "https://builtbybit.com/wiki",
};

export const ContentTypeNames: { [key in ContentType]: string } = {
  [ContentType.CONVERSATION]: "conversation",
  [ContentType.TICKET]: "ticket",
  [ContentType.THREAD]: "thread",
  [ContentType.REPORT]: "report",
  [ContentType.WIKI]: "wiki",
};
