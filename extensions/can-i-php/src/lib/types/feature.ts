import { Resource } from "./resource";

export interface Feature {
  name: string;
  description: string;
  keywords: string[];
  added: string;
  deprecated: string | null;
  removed: string | null;
  resources: Resource[];
}
