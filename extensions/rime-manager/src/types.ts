export type Preferences = {
  rimeUserDirectory?: string;
  backupDirectory?: string;
  reloadAfterChanges: boolean;
};

export type RimeSchema = {
  id: string;
  name: string;
  path: string;
  customPath: string;
  hasPinCandidateFilter: boolean;
  hasExistingBlockedWordsFilter: boolean;
};

export type RimeInstallation = {
  userDataDir: string;
  squirrelAppPath?: string;
  squirrelExecutable?: string;
  distributionName?: string;
  distributionVersion?: string;
  rimeVersion?: string;
  currentSchemaId?: string;
  schemas: RimeSchema[];
  hasExistingBlockedWordsFilter: boolean;
  blockedWordsPath: string;
  loweredWordsPath: string;
  squirrelCustomPath: string;
};

export type PinRule = {
  id: string;
  schemaId: string;
  schemaName: string;
  code: string;
  candidates: string[];
};

export type BlockRule = {
  id: string;
  value: string;
  kind: "exact" | "contains";
};

export type LowerRule = {
  id: string;
  value: string;
  code: string;
};

export type AppMode = "chinese" | "english" | "remember";

export type AppOption = {
  bundleId: string;
  asciiMode?: boolean;
  asciiPunct?: boolean;
  inline?: boolean;
  vimMode?: boolean;
};
