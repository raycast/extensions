/**
 * Storage interface for dependency injection.
 * Consumers must provide an implementation (e.g., Raycast LocalStorage, Node fs, Redis).
 */

export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let _storage: StorageProvider | null = null;

/**
 * Initialize the storage provider. Must be called once before using any API functions.
 */
export function initStorage(provider: StorageProvider): void {
  _storage = provider;
}

/**
 * Get the configured storage provider.
 * Throws if initStorage() has not been called.
 */
export function getStorage(): StorageProvider {
  if (!_storage) {
    throw new Error("Odoo storage not initialized. Call initStorage() first.");
  }
  return _storage;
}
