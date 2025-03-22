import { ScriptCommand } from "@models";

export interface Group {
  name: string;
  path: string;
  readme?: string;
  scriptCommands: ScriptCommand[];
  subGroups?: Group[];
}

export interface CompactGroup {
  identifier: string;
  title: string;
  subtitle?: string;
  readme?: string;
  scriptCommands: ScriptCommand[];
}
