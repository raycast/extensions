import { Item, ItemsJson, Vault, VaultsJson } from "./types";
import { promisify } from "util";
import { execFile } from "child_process";
import { Cache, getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";

const execFileAsync = promisify(execFile);

export type { Item, Vault };

export class Client {
  private cache = new Cache();
  private static VAULTS_CACHE_KEY = "vaults";
  private static ITEMS_CACHE_KEY = "items";

  constructor(private cliPath: string) {}

  // --- Cache ---

  private getCachedVaults(): Vault[] | null {
    const cachedVaults = this.cache.get(Client.VAULTS_CACHE_KEY);
    if (!cachedVaults) return null;
    return this.parseVaults(cachedVaults);
  }

  private setCachedVaults(rawJson: string) {
    this.cache.set(Client.VAULTS_CACHE_KEY, rawJson);
  }

  private async getCachedItems(vaultName: string): Promise<Item[] | null> {
    const cachedItems = this.cache.get(`${Client.ITEMS_CACHE_KEY}:${vaultName}`);
    if (!cachedItems) return null;
    return await this.parseItems(cachedItems);
  }

  private setCachedItems(rawJson: string, vaultName: string) {
    this.cache.set(`${Client.ITEMS_CACHE_KEY}:${vaultName}`, rawJson);
  }

  // -- CLI Operations

  private async getVaultName(vaultId: string): Promise<string | null> {
    const vaults = await this.getAllVaults();
    return vaults.find((v) => v.id === vaultId)?.title ?? null;
  }

  async getAllVaults(forceRefresh: boolean = false): Promise<Vault[]> {
    const fetchAndRefreshVaults = async () => {
      const { stdout, stderr } = await execFileAsync(this.cliPath, ["vault", "list", "--output=json"]);
      if (stderr) throw new Error(`Error fetching vaults: ${stderr}`);
      this.setCachedVaults(stdout);
      return stdout;
    };

    const cachedVaults = this.getCachedVaults();
    if (cachedVaults && !forceRefresh) {
      fetchAndRefreshVaults(); //Refresh cache in the background
      return cachedVaults;
    }

    const vaultsJson = await fetchAndRefreshVaults();
    return this.parseVaults(vaultsJson);
  }

  async getItems(vaultName: string | null, forceRefresh: boolean = false): Promise<Item[]> {
    const fetchAndRefreshItems = async (vaultName: string) => {
      const { stdout, stderr } = await execFileAsync(this.cliPath, ["item", "list", vaultName, "--output=json"]);
      if (stderr) throw new Error(`Error fetching items: ${stderr}`);
      this.setCachedItems(stdout, vaultName);
      return stdout;
    };

    if (vaultName) {
      const cachedItems = await this.getCachedItems(vaultName);
      if (cachedItems != null && !forceRefresh) {
        fetchAndRefreshItems(vaultName); // Refresh cache in the background
        return cachedItems;
      }
      const itemsJson = await fetchAndRefreshItems(vaultName);
      return this.parseItems(itemsJson);
    } else {
      const vaults = await this.getAllVaults();
      const fetchPromises = vaults.map(async (vault) => {
        const cachedItems = await this.getCachedItems(vault.title);
        if (cachedItems != null && !forceRefresh) {
          fetchAndRefreshItems(vault.title);
          return cachedItems;
        }

        const itemsJson = await fetchAndRefreshItems(vault.title);
        return this.parseItems(itemsJson);
      });
      const results = await Promise.all(fetchPromises);
      return results.flat();
    }
  }

  // --- Parsers that also hydrate caches ---

  private parseVaults(rawJson: string): Vault[] {
    const parsed = JSON.parse(rawJson) as VaultsJson;
    const vaults = parsed.vaults.map((v) => ({ title: v.name, id: v.vault_id }));
    return vaults;
  }

  private async parseItems(rawJson: string): Promise<Item[]> {
    const parsed = JSON.parse(rawJson) as ItemsJson;
    if (!parsed.items || parsed.items.length === 0) return [];
    const vaultName = await this.getVaultName(parsed.items[0].vault_id);

    const items: Item[] = parsed.items.map((it) => {
      const content = it.content.content;

      if (content.Login) {
        return {
          id: it.id,
          title: it.content.title,
          vaultId: it.vault_id,
          state: it.state,
          vaultTitle: vaultName || undefined,
          type: "Login",
          email: content.Login.email,
          username: content.Login.username,
          password: content.Login.password,
          urls: content.Login.urls,
        };
      }

      if (content.Identity) {
        return {
          id: it.id,
          title: it.content.title,
          vaultId: it.vault_id,
          state: it.state,
          vaultTitle: vaultName || undefined,
          type: "Identity",
          full_name: content.Identity.full_name,
          email: content.Identity.email,
          phone_number: content.Identity.phone_number,
          first_name: content.Identity.first_name,
          middle_name: content.Identity.middle_name,
          last_name: content.Identity.last_name,
          birthdate: content.Identity.birthdate,
          gender: content.Identity.gender,
          extra_personal_details: content.Identity.extra_personal_details,
          organization: content.Identity.organization,
          street_address: content.Identity.street_address,
          zip_or_postal_code: content.Identity.zip_or_postal_code,
        };
      }

      if (content.CreditCard) {
        return {
          id: it.id,
          title: it.content.title,
          vaultId: it.vault_id,
          state: it.state,
          vaultTitle: vaultName || undefined,
          type: "CreditCard",
          cardholder_name: content.CreditCard.cardholder_name,
          card_type: content.CreditCard.card_type,
          number: content.CreditCard.number,
          verification_number: content.CreditCard.verification_number,
          expiration_date: content.CreditCard.expiration_date,
        };
      }

      if (content.SshKey) {
        return {
          id: it.id,
          title: it.content.title,
          vaultId: it.vault_id,
          state: it.state,
          vaultTitle: vaultName || undefined,
          type: "SSHKey",
          private_key: content.SshKey.private_key,
          public_key: content.SshKey.public_key,
        };
      }

      // Fallback: treat as Login with basic fields to avoid crashes
      return {
        id: it.id,
        title: it.content.title,
        vaultId: it.vault_id,
        state: it.state,
        vaultTitle: vaultName || undefined,
        type: "Login",
      };
    });
    return items;
  }
}

const { cliPath } = getPreferenceValues<ExtensionPreferences>();
// Single in-memory client
let client: Client | null = null;

export function getPassClient() {
  if (!client) {
    client = new Client(cliPath);
  }
  return client;
}

export function useClient() {
  return useMemo(() => getPassClient(), []);
}
