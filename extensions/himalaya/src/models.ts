export enum Flag {
  Seen = "Seen",
  Answered = "Answered",
  Flagged = "Flagged",
  Deleted = "Deleted",
  Draft = "Draft",
  Recent = "Recent",
  // TODO Custom
}

export interface Envelope {
  id: string;
  internal_id: string;
  message_id: string;
  flags: Flag[];
  from: {
    name: string;
    addr: string;
  };
  subject: string;
  date: Date;
}

export interface Folder {
  delim: string;
  name: string;
  desc: string;
}
