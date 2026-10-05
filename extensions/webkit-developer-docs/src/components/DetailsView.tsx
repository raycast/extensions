import { List } from "@raycast/api";
import { Doc } from "../types";
import TurndownService from "turndown";

const turndown = new TurndownService();

export const DetailsView = ({ doc }: { doc: Doc }) => (
  <List.Item.Detail markdown={doc.title + "\n\n" + turndown.turndown(doc.text)} />
);
