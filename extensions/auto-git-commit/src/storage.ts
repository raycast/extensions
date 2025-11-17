import { LocalStorage } from "@raycast/api";
import { Repository } from "./types";

const STORAGE_KEYS = {
  REPOSITORIES: "repositories",
} as const;

export class StorageManager {
  static async getRepositories(): Promise<Repository[]> {
    try {
      const data = await LocalStorage.getItem(STORAGE_KEYS.REPOSITORIES);
      if (!data) return [];

      const repos = JSON.parse(data as string) as Repository[];
      return repos.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.lastUsed - a.lastUsed;
      });
    } catch (error) {
      console.error("Failed to load repositories:", error);
      return [];
    }
  }

  static async saveRepositories(repositories: Repository[]): Promise<void> {
    try {
      await LocalStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(repositories));
    } catch (error) {
      console.error("Failed to save repositories:", error);
      throw error;
    }
  }

  static async addRepository(repository: Repository): Promise<void> {
    const repositories = await this.getRepositories();
    const existingIndex = repositories.findIndex((repo) => repo.path === repository.path);

    if (existingIndex >= 0) {
      repositories[existingIndex] = {
        ...repositories[existingIndex],
        ...repository,
        id: repositories[existingIndex].id,
      };
    } else {
      repositories.push(repository);
    }

    await this.saveRepositories(repositories);
  }

  static async removeRepository(id: string): Promise<void> {
    const repositories = await this.getRepositories();
    const filtered = repositories.filter((repo) => repo.id !== id);
    await this.saveRepositories(filtered);
  }

  static async updateRepository(id: string, updates: Partial<Repository>): Promise<void> {
    const repositories = await this.getRepositories();
    const index = repositories.findIndex((repo) => repo.id === id);

    if (index >= 0) {
      repositories[index] = { ...repositories[index], ...updates };
      await this.saveRepositories(repositories);
    }
  }

  static async incrementRepositoryUsage(id: string): Promise<void> {
    const repositories = await this.getRepositories();
    const index = repositories.findIndex((repo) => repo.id === id);

    if (index >= 0) {
      repositories[index].useCount++;
      repositories[index].lastUsed = Date.now();
      await this.saveRepositories(repositories);
    }
  }

  static async togglePinRepository(id: string): Promise<void> {
    const repositories = await this.getRepositories();
    const index = repositories.findIndex((repo) => repo.id === id);

    if (index >= 0) {
      repositories[index].isPinned = !repositories[index].isPinned;
      await this.saveRepositories(repositories);
    }
  }
}
