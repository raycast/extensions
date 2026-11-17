import type { ExternalAdapterManifest, PasswordManagerAdapter, VaultItem } from "../types";
import {
  assertAuthRequirementsResult,
  assertIsAvailableResult,
  assertItemAvailabilityResult,
  assertItemsResult,
  assertValueResult,
  invokeExternalAdapter,
  normalizeVaultItems,
  STATELESS_EXTERNAL_METHODS,
  type ExternalAdapterMethod,
  type OptionalExternalCapability,
} from "./external-protocol";
import { getExistingSession, getOrCreateSession, getSessionIdleTimeoutMs } from "./external-session";

function hasCapability(manifest: ExternalAdapterManifest, capability: OptionalExternalCapability): boolean {
  return manifest.capabilities?.includes(capability) ?? false;
}

function isPersistent(manifest: ExternalAdapterManifest): boolean {
  return manifest.mode === "persistent";
}

async function callAdapter<T>(
  manifest: ExternalAdapterManifest,
  method: ExternalAdapterMethod,
  params: Record<string, unknown>,
  mapResult: (result: unknown) => T,
): Promise<T> {
  const command = {
    executable: manifest.executable,
    args: manifest.args,
    cwd: manifest.workingDirectory,
    env: manifest.env,
  };

  if (isPersistent(manifest)) {
    const existing = getExistingSession(manifest.id);
    const useSession = Boolean(existing) || !STATELESS_EXTERNAL_METHODS.includes(method);

    if (useSession) {
      const session = getOrCreateSession(manifest);
      return mapResult(await session.invoke(method, params));
    }
  }

  const result = await invokeExternalAdapter(command, method, params);
  return mapResult(result);
}

export function createExternalScriptAdapter(manifest: ExternalAdapterManifest): PasswordManagerAdapter {
  const adapter: PasswordManagerAdapter = {
    kind: "external",
    id: manifest.id,
    name: manifest.name,
    cliBinary: "",

    async isAvailable() {
      return callAdapter(manifest, "isAvailable", {}, assertIsAvailableResult);
    },

    async searchItems(query: string): Promise<VaultItem[]> {
      const items = await callAdapter(manifest, "searchItems", { query }, assertItemsResult);
      return normalizeVaultItems(items, manifest.id);
    },

    async getPassword(item: VaultItem): Promise<string> {
      const value = await callAdapter(manifest, "getPassword", { item }, assertValueResult);
      if (!value) {
        throw new Error(`Password not available for: ${item.title}`);
      }
      return value;
    },

    async getUsername(item: VaultItem): Promise<string | undefined> {
      return callAdapter(manifest, "getUsername", { item }, assertValueResult);
    },

    async getEmail(item: VaultItem): Promise<string | undefined> {
      return callAdapter(manifest, "getEmail", { item }, assertValueResult);
    },

    async getTotp(item: VaultItem): Promise<string | undefined> {
      return callAdapter(manifest, "getTotp", { item }, assertValueResult);
    },
  };

  if (hasCapability(manifest, "listItems")) {
    adapter.listItems = async () => {
      const items = await callAdapter(manifest, "listItems", {}, assertItemsResult);
      return normalizeVaultItems(items, manifest.id);
    };
  }

  if (hasCapability(manifest, "getUrl")) {
    adapter.getUrl = async (item: VaultItem) => {
      return callAdapter(manifest, "getUrl", { item }, assertValueResult);
    };
  }

  if (hasCapability(manifest, "getItemAvailability")) {
    adapter.getItemAvailability = async (item: VaultItem) => {
      return callAdapter(manifest, "getItemAvailability", { item }, assertItemAvailabilityResult);
    };
  }

  if (hasCapability(manifest, "openInManager")) {
    adapter.openInManager = async (item: VaultItem) => {
      await callAdapter(manifest, "openInManager", { item }, () => undefined);
    };
  }

  if (hasCapability(manifest, "getAuthRequirements")) {
    adapter.getAuthRequirements = async () => {
      return callAdapter(manifest, "getAuthRequirements", {}, assertAuthRequirementsResult);
    };
  }

  if (hasCapability(manifest, "authenticate")) {
    adapter.authenticate = async (credentials) => {
      return callAdapter(
        manifest,
        "authenticate",
        { credentials, idleTimeoutMs: getSessionIdleTimeoutMs() },
        assertIsAvailableResult,
      );
    };
  }

  return adapter;
}
