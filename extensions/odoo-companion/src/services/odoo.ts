import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences, OdooResponse, OdooSearchOptions } from "../types";

// Cache simple pour stocker les derniers résultats
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

export class OdooService {
  private preferences: Preferences;
  private uid: number | null = null;
  private cache = new SimpleCache();

  constructor(preferences: Preferences) {
    this.preferences = preferences;
  }

  private get apiUrl(): string {
    return `${this.preferences.odooUrl.replace(/\/$/, "")}/jsonrpc`;
  }

  /**
   * Authentifie l'utilisateur et récupère l'UID
   */
  async authenticate(): Promise<number | null> {
    if (this.uid) {
      return this.uid;
    }

    try {
      const authBody = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "login",
          args: [this.preferences.database, this.preferences.userLogin, this.preferences.apiKey],
        },
        id: Math.floor(Math.random() * 1000000),
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as OdooResponse<number>;

      if (data.error) {
        throw new Error(data.error.data?.message || data.error.message);
      }

      this.uid = data.result || null;
      return this.uid;
    } catch (error) {
      console.error("Authentication error:", error);
      let errorMessage = "Failed to authenticate with Odoo";
      let title = "Authentication Error";

      if (error instanceof Error) {
        if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
          title = "Connection Error";
          errorMessage = "Cannot connect to Odoo server. Please check your URL and internet connection.";
        } else if (error.message.includes("401") || error.message.includes("403")) {
          errorMessage = "Invalid credentials. Please check your username and API key.";
        } else if (error.message.includes("database")) {
          errorMessage = "Database not found. Please check your database name.";
        } else {
          errorMessage = error.message;
        }
      }

      showFailureToast({
        title,
        message: errorMessage,
      });
      return null;
    }
  }

  /**
   * Exécute une méthode Odoo générique
   */
  async execute<T = unknown>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> | OdooSearchOptions = {},
  ): Promise<T | null> {
    try {
      const uid = await this.authenticate();
      if (!uid) {
        return null;
      }

      const requestBody = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [this.preferences.database, uid, this.preferences.apiKey, model, method, args, kwargs],
        },
        id: Math.floor(Math.random() * 1000000),
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as OdooResponse<T>;

      if (data.error) {
        throw new Error(data.error.data?.message || data.error.message);
      }

      return data.result || null;
    } catch (error) {
      console.error(`Error executing ${model}.${method}:`, error);

      // Provide more context in error messages
      if (error instanceof Error) {
        if (error.message.includes("ENOTFOUND")) {
          throw new Error(
            `Cannot reach Odoo server at ${this.preferences.odooUrl}. Please check the URL and your internet connection.`,
          );
        } else if (error.message.includes("ECONNREFUSED")) {
          throw new Error(`Connection refused by Odoo server. Please verify the URL and server status.`);
        } else if (error.message.includes("timeout")) {
          throw new Error(`Request timed out. The Odoo server may be slow or overloaded.`);
        }
      }

      throw error;
    }
  }

  /**
   * Recherche des enregistrements avec un domaine de recherche
   */
  async searchRead<T = unknown>(model: string, domain: unknown[] = [], options: OdooSearchOptions): Promise<T[]> {
    const cacheKey = `${model}-${JSON.stringify(domain)}-${JSON.stringify(options)}`;

    try {
      const result = await this.execute<T[]>(model, "search_read", [domain], options);
      const data = result || [];

      // Cache successful results
      if (data.length > 0) {
        this.cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error(`Error searching ${model}:`, error);

      // Try to return cached data if available
      const cachedData = this.cache.get<T[]>(cacheKey);
      if (cachedData) {
        showToast({
          style: Toast.Style.Success,
          title: "Showing cached data",
          message: "Using previous results due to connection issue",
        });
        return cachedData;
      }

      // Show appropriate error message
      let errorMessage = `Failed to search ${model}`;
      if (error instanceof Error) {
        if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
          errorMessage = "Cannot connect to Odoo server. Please check your connection.";
        } else if (error.message.includes("access")) {
          errorMessage = "Access denied. You may not have permission to view this data.";
        } else {
          errorMessage = error.message;
        }
      }

      showFailureToast({
        title: "Search Error",
        message: errorMessage,
      });
      return [];
    }
  }

  /**
   * Recherche des enregistrements par nom
   */
  async searchByName<T = unknown>(
    model: string,
    query: string,
    options: Omit<OdooSearchOptions, "domain">,
  ): Promise<T[]> {
    const domain = ["|", ["name", "ilike", query], ["display_name", "ilike", query]];
    return this.searchRead<T>(model, domain, { ...options, domain });
  }

  /**
   * Récupère tous les enregistrements d'un modèle (avec limite)
   */
  async getAll<T = unknown>(
    model: string,
    options: Omit<OdooSearchOptions, "domain"> & { limit?: number } = { fields: [] },
  ): Promise<T[]> {
    const searchOptions: OdooSearchOptions = {
      ...options,
      limit: options.limit || 100,
    };
    return this.searchRead<T>(model, [], searchOptions);
  }

  /**
   * Teste la connectivité avec l'instance Odoo
   */
  async testConnection(): Promise<boolean> {
    try {
      const uid = await this.authenticate();
      return uid !== null;
    } catch {
      return false;
    }
  }

  /**
   * Invalide les caches
   */
  invalidateAuth(): void {
    this.uid = null;
    this.cache.clear();
  }
}
