import { Color } from "@raycast/api";

export interface AgentDef {
  id: string;
  displayName: string;
  globalSkillsDir: string;
  isUniversal: boolean;
  systemSubdirs?: string[];
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  [key: string]: unknown;
}

export interface AgentInfo {
  id: string;
  displayName: string;
  color: Color;
}

export interface Skill {
  name: string;
  description: string;
  realPath: string;
  skillMdPath: string;
  markdownContent: string;
  agents: AgentInfo[];
  isUniversal: boolean;
  isSystem: boolean;
  supplementaryFiles: string[];
}
