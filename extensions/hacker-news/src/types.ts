import Parser from "rss-parser";

export enum Topic {
  Active = "active",
  AskHN = "ask",
  Best = "best",
  BestComments = "bestcomments",
  Classic = "classic",
  FrontPage = "frontpage",
  Invited = "invited",
  Jobs = "jobs",
  Launches = "launches",
  NewComments = "newcomments",
  Newest = "newest",
  Polls = "polls",
  Pool = "pool",
  ShowHN = "show",
  WhoIsHiring = "whoishiring",
}

export type CacheEntry = {
  timestamp: number;
  items: Parser.Item[];
};
