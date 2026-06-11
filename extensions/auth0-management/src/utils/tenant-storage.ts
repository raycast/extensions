import { LocalStorage, Color } from "@raycast/api";
import { Tenant } from "./types";

const TENANTS_KEY = "tenants";

const COLOR_PALETTE: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
  Color.Magenta,
];

/** Convert a tenant name into a URL-safe slug for use as an ID. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Pick the next color from the palette based on how many tenants already exist. */
function nextColor(existingTenants: Tenant[]): Color {
  return COLOR_PALETTE[existingTenants.length % COLOR_PALETTE.length];
}

/** Load all tenants from Raycast LocalStorage. Returns an empty array if none exist. */
export async function getTenants(): Promise<Tenant[]> {
  const raw = await LocalStorage.getItem<string>(TENANTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Tenant[];
  } catch {
    return [];
  }
}

/** Persist the full tenants array to Raycast LocalStorage. */
async function saveTenants(tenants: Tenant[]): Promise<void> {
  await LocalStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
}

/** Create a new tenant with an auto-generated ID and color, then save it. */
export async function addTenant(data: Omit<Tenant, "id" | "color">): Promise<Tenant> {
  const tenants = await getTenants();
  const tenant: Tenant = {
    ...data,
    id: slugify(data.name) || `tenant-${Date.now()}`,
    color: nextColor(tenants),
  };
  tenants.push(tenant);
  await saveTenants(tenants);
  return tenant;
}

/** Update an existing tenant's fields by ID. No-op if the tenant doesn't exist. */
export async function updateTenant(id: string, updates: Partial<Omit<Tenant, "id">>): Promise<void> {
  const tenants = await getTenants();
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tenants[idx] = { ...tenants[idx], ...updates };
  await saveTenants(tenants);
}

/** Remove a tenant by ID from LocalStorage. */
export async function deleteTenant(id: string): Promise<void> {
  const tenants = await getTenants();
  await saveTenants(tenants.filter((t) => t.id !== id));
}

/** Check whether a tenant has all required credentials (domain, clientId, clientSecret). */
export function isTenantConfigured(tenant: Tenant): boolean {
  return Boolean(tenant.domain && tenant.clientId && tenant.clientSecret);
}
