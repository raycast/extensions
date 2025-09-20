import { Snippet } from "./snippet";
import { AttributionUser } from "./user";

export interface Label {
  id: number;
  guid: string;
  title: string;
  isPrivate: boolean;
  color: string | null;
  colorKey: number;
  labelOrder: number;
  createdAt: string;
  updatedAt: string;
  snippets: Pick<Snippet, "guid">[];
  parent: Label | null;
  children: Label[];
  createdBy: AttributionUser;
  lastUpdatedBy: AttributionUser;
}
