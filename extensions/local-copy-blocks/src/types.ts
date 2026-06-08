export type BlockSetId = 1 | 2 | 3;

export type BlockSetConfig = {
  id: BlockSetId;
  commandTitle: string;
  displayName: string;
  isEnabled: boolean;
  directory?: string;
};

export type ConfiguredBlockSet = BlockSetConfig & {
  directory: string;
};

export type BlockFile = {
  path: string;
  name: string;
  relativePath: string;
  blockSet: ConfiguredBlockSet;
  updatedAt: Date;
  size: number;
};

export type BlockSetLoadFailure = {
  blockSet: ConfiguredBlockSet;
  message: string;
};

export type BlockFileLoadResult = {
  files: BlockFile[];
  failures: BlockSetLoadFailure[];
};
