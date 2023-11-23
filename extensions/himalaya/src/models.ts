import "reflect-metadata";
import { Type } from "class-transformer";

export enum Flag {
  Seen = "Seen",
  Answered = "Answered",
  Flagged = "Flagged",
  Deleted = "Deleted",
  Draft = "Draft",
  Recent = "Recent",
  // TODO Custom
}

export class Envelope {
  id: string;
  internal_id: string;
  message_id: string;
  flags: Flag[];
  @Type(() => From)
  from: From;
  subject: string;
  @Type(() => Date)
  date: Date;

  constructor(
    id: string,
    internal_id: string,
    message_id: string,
    flags: Flag[],
    from: From,
    subject: string,
    date: Date
  ) {
    this.id = id;
    this.internal_id = internal_id;
    this.message_id = message_id;
    this.flags = flags;
    this.from = from;
    this.subject = subject;
    this.date = date;
  }
}

export class From {
  name: string;
  addr: string;

  constructor(name: string, addr: string) {
    this.name = name;
    this.addr = addr;
  }
}

export class Folder {
  delim: string;
  name: string;
  desc: string;

  constructor(delim: string, name: string, desc: string) {
    this.delim = delim;
    this.name = name;
    this.desc = desc;
  }
}
