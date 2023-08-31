export enum VSCodeBuild {
  Code = "Code",
  Insiders = "Code - Insiders",
  VSCodium = "VSCodium",
  VSCodiumMinor = "VSCodium < 1.71",
}

export type Preferences = {
  build: VSCodeBuild;
  workspacePath: string;
};

export type Arguments = {
  project: string;
};
