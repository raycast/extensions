import type { WritablePropertyTypes } from "..";

export interface DatabaseProperty {
  id: string;
  type: WritablePropertyTypes;
  name: string;
  options: DatabasePropertyOption[];
  relation_id?: string;
}
export interface DatabasePropertyOption {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
}
