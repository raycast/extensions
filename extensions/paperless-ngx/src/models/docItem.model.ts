import { Document } from "./paperlessResponse.model";

export interface DocItem {
  document: Document;
  tags?: string;
  correspondent?: string;
  type?: string;
}
