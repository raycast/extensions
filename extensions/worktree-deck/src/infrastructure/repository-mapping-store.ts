import { repositoryMappingUsecase } from "../application/repository-mapping.usecase";
import {
  repositoryMappingService,
  type RepositoryMapping,
  type RepositoryMappingInput,
} from "../domain/repository-mapping.service";
import { createRepositoryMappingDependencies } from "../interface-adapters/repository-mapping-dependencies";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";
/**
 * repository mapping 用の storage ファイル名
 */
const REPOSITORY_MAPPING_STORAGE_FILE = "repository-mappings.json";

/**
 * repository mapping 用の storage 引数を組み立てる
 */
function buildRepositoryMappingStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * storage から repository mapping を読み込む
 */
async function loadMappingsFromStorage(): Promise<RepositoryMapping[]> {
  const stored = await readWorktreeDeckFileStorageJson<unknown>(
    buildRepositoryMappingStorageArgs(),
    REPOSITORY_MAPPING_STORAGE_FILE,
  );
  return repositoryMappingService.sort(repositoryMappingService.parseFromStorageValue(stored ?? ""));
}

/**
 * repository mapping を storage へ保存する
 */
async function saveMappingsToStorage(entries: RepositoryMapping[]): Promise<void> {
  await writeWorktreeDeckFileStorageJson(buildRepositoryMappingStorageArgs(), REPOSITORY_MAPPING_STORAGE_FILE, entries);
}

/**
 * repository mapping の依存アダプタを作る
 */
function createDependencies() {
  return createRepositoryMappingDependencies({
    loadFromStorage: loadMappingsFromStorage,
    saveToStorage: saveMappingsToStorage,
  });
}

/**
 * repository mapping を読み込む
 */
export async function loadRepositoryMappings(): Promise<RepositoryMapping[]> {
  return repositoryMappingUsecase.load({
    dependencies: createDependencies(),
  });
}

/**
 * repository mapping を保存する
 */
export async function saveRepositoryMappings(entries: RepositoryMappingInput[]): Promise<RepositoryMapping[]> {
  return repositoryMappingUsecase.save({
    entries,
    dependencies: createDependencies(),
  });
}
