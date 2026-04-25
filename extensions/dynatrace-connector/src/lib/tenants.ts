// src/lib/tenants.ts
// CRUD operations for Dynatrace tenant configurations.
// Data is stored in Raycast LocalStorage (non-synced — safe for secrets like clientSecret).
// Note: Raycast LocalStorage does NOT sync across devices via iCloud/CloudSync,
// which is intentional here to keep OAuth credentials local to each machine.

import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { isMockMode } from "./devMode";
import type { TenantConfig } from "./auth";

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tenants:v1";
const ACTIVE_KEY = "tenants:active";

// ── Mock data for development ──────────────────────────────────────────────────

const MOCK_TENANTS: TenantConfig[] = [
  {
    id: "mock-prod",
    name: "Production (Mock)",
    tenantEndpoint: "https://prod.live.dynatrace.com",
    clientId: "dt0s02.MOCK_PROD_ID",
    clientSecret: "dt0s02.MOCK_PROD_SECRET.XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ssoEndpoint: "https://sso.dynatrace.com/sso/oauth2/token",
    scopes: ["storage:logs:read", "storage:problems:read", "entity:read"],
  },
  {
    id: "mock-dev",
    name: "Development (Mock)",
    tenantEndpoint: "https://dev.live.dynatrace.com",
    clientId: "dt0s02.MOCK_DEV_ID",
    clientSecret: "dt0s02.MOCK_DEV_SECRET.XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ssoEndpoint: "https://sso.dynatrace.com/sso/oauth2/token",
    scopes: ["storage:logs:read", "storage:problems:read", "entity:read"],
  },
  {
    id: "mock-staging",
    name: "Staging (Mock)",
    tenantEndpoint: "https://staging.live.dynatrace.com",
    clientId: "dt0s02.MOCK_STAGING_ID",
    clientSecret: "dt0s02.MOCK_STAGING_SECRET.XXXXXXXXXXXXXXXXXXXXXXXX",
    ssoEndpoint: "https://sso.dynatrace.com/sso/oauth2/token",
    scopes: ["storage:logs:read", "storage:problems:read", "entity:read"],
  },
];

// ── Zod schema ────────────────────────────────────────────────────────────────

export const tenantConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tenantEndpoint: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  ssoEndpoint: z.string().url(),
  scopes: z.array(z.string()),
  accountUrn: z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readAll(): Promise<TenantConfig[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    // If no tenants and mock mode is enabled, return mock data for development
    if (isMockMode()) {
      return MOCK_TENANTS;
    }
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return z.array(tenantConfigSchema).parse(parsed);
  } catch {
    // If parsing fails and mock mode is enabled, return mock data
    if (isMockMode()) {
      return MOCK_TENANTS;
    }
    return [];
  }
}

async function writeAll(tenants: TenantConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listTenants(): Promise<TenantConfig[]> {
  return readAll();
}

export async function saveTenant(tenant: TenantConfig): Promise<void> {
  const tenants = await readAll();
  const idx = tenants.findIndex((t) => t.id === tenant.id);
  if (idx >= 0) {
    tenants[idx] = tenant;
  } else {
    tenants.push(tenant);
  }
  await writeAll(tenants);
}

export async function deleteTenant(id: string): Promise<void> {
  const tenants = await readAll();
  await writeAll(tenants.filter((t) => t.id !== id));

  // Clear active if deleted
  const activeId = await LocalStorage.getItem<string>(ACTIVE_KEY);
  if (activeId === id) {
    await LocalStorage.removeItem(ACTIVE_KEY);
  }
}

export async function getActiveTenant(): Promise<TenantConfig | null> {
  const tenants = await readAll();
  if (tenants.length === 0) return null;

  // In mock mode, prefer "Production (Mock)" if available
  if (isMockMode()) {
    const mockProd = tenants.find((t) => t.id === "mock-prod");
    if (mockProd) return mockProd;
  }

  const activeId = await LocalStorage.getItem<string>(ACTIVE_KEY);
  if (activeId) {
    const found = tenants.find((t) => t.id === activeId);
    if (found) return found;
  }

  // Fall back to first tenant if no activeId or not found
  return tenants[0];
}

export async function setActiveTenant(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_KEY, id);
}
