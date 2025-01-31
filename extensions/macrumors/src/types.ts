import Parser from "rss-parser";

export interface State {
  items?: Parser.Item[];
  error?: Error;
}
