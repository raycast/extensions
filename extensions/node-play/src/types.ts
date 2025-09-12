export interface NodeProject {
  name: string;
  path: string;
  scripts: Record<string, string>;
}

export interface ProjectScript {
  projectName: string;
  scriptName: string;
  scriptCommand: string;
  projectPath: string;
}

export interface Config {
  rootDirectories: string[];
}
