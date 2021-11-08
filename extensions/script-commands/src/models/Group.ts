import { ScriptCommand } from "@models";

export interface Group {
  name: string;
  path: string;
  scriptCommands: ScriptCommand[];
  subGroups?: Group[];
}