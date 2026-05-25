import type {
  LoadRepositoryMappingsDependencies,
  SaveRepositoryMappingsDependencies,
} from "../application/repository-mapping.usecase";
import type { RepositoryMapping } from "../domain/repository-mapping.service";

/**
 * repository mapping の infra 入力
 */
type RepositoryMappingInfra = {
  loadFromStorage(): Promise<RepositoryMapping[]>;
  saveToStorage(entries: RepositoryMapping[]): Promise<void>;
};

/**
 * repository mapping 用の依存アダプタを組み立てる
 */
export function createRepositoryMappingDependencies(
  infra: RepositoryMappingInfra,
): LoadRepositoryMappingsDependencies & SaveRepositoryMappingsDependencies {
  return {
    loadMappingsFromStorage() {
      return infra.loadFromStorage();
    },
    saveMappingsToStorage(entries) {
      return infra.saveToStorage(entries);
    },
  };
}
