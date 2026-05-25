import {
  repositoryMappingService,
  type RepositoryMapping,
  type RepositoryMappingInput,
} from "../domain/repository-mapping.service";

/**
 * repository mapping 読み込みユースケースの依存ポート
 */
export type LoadRepositoryMappingsDependencies = {
  loadMappingsFromStorage(): Promise<RepositoryMapping[]>;
};

/**
 * repository mapping 保存ユースケースの依存ポート
 */
export type SaveRepositoryMappingsDependencies = {
  saveMappingsToStorage(entries: RepositoryMapping[]): Promise<void>;
};

/**
 * repository mapping を読み込む
 */
async function load(args: { dependencies: LoadRepositoryMappingsDependencies }): Promise<RepositoryMapping[]> {
  const stored = repositoryMappingService.sort(await args.dependencies.loadMappingsFromStorage());
  return stored;
}

/**
 * repository mapping を保存する
 */
async function save(args: {
  entries: RepositoryMappingInput[];
  dependencies: SaveRepositoryMappingsDependencies;
}): Promise<RepositoryMapping[]> {
  const normalized = repositoryMappingService.normalize(args.entries);
  const sorted = repositoryMappingService.sort(normalized);
  await args.dependencies.saveMappingsToStorage(sorted);
  return sorted;
}

/**
 * repository mapping ユースケース関数群
 */
export const repositoryMappingUsecase = {
  load,
  save,
} as const;
