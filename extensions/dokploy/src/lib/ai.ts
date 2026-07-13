import { getActiveAccount, listAccounts } from "../accounts/storage";
import { DokployClient } from "../api/client";
import { enrichServices, flattenServices, listProjects } from "../api/dokploy-api";
import { ServiceKind, ServiceRef } from "../types/dokploy";
import { serviceKindConfig } from "./service-kinds";

/**
 * Shared plumbing for the AI tools in `src/tools`.
 *
 * Tools run headless, so anything that goes wrong has to come back as a thrown `Error` - Raycast
 * hands that message to the model, which then has enough to correct itself or ask the user. That's
 * why the errors below list the available names instead of just saying "not found".
 */

/**
 * Resolves which instance a tool should talk to. Tools take an optional `account` so the user can
 * say "deploy api on staging"; without it, the active account is used.
 */
export async function requireClient(accountLabel?: string): Promise<DokployClient> {
  const accounts = await listAccounts();

  if (accounts.length === 0) {
    throw new Error(
      "No Dokploy account is connected. Ask the user to add one with the Dokploy “Manage Accounts” command.",
    );
  }

  if (!accountLabel) {
    const active = await getActiveAccount();
    if (!active) throw new Error("No active Dokploy account.");
    return new DokployClient(active);
  }

  const needle = accountLabel.trim().toLowerCase();
  const match =
    accounts.find((account) => account.label.toLowerCase() === needle) ??
    accounts.find((account) => account.label.toLowerCase().includes(needle));

  if (!match) {
    const known = accounts.map((account) => account.label).join(", ");
    throw new Error(`No Dokploy account named “${accountLabel}”. Connected accounts: ${known}.`);
  }

  return new DokployClient(match);
}

/** Enriched, because `project.all` sends databases with nothing but an id — see `enrichServices`. */
export async function loadServices(client: DokployClient): Promise<ServiceRef[]> {
  const projects = await listProjects(client);
  return enrichServices(client, flattenServices(projects));
}

export interface ResolveOptions {
  kind?: ServiceKind;
  /** Narrows the search when two projects have a service with the same name. */
  project?: string;
}

function describeCandidate(service: ServiceRef): string {
  return `${service.name} (${serviceKindConfig(service.kind).label} in ${service.projectName}/${service.environmentName})`;
}

/**
 * Finds the one service the user meant.
 *
 * Matching widens in steps - id, then exact name, then prefix, then substring - and stops at the
 * first step that produces any hit, so a service literally called "api" always wins over
 * "api-worker". An ambiguous result is an error listing the candidates rather than a guess,
 * because guessing here means deploying the wrong thing.
 */
export async function resolveService(
  client: DokployClient,
  query: string,
  options: ResolveOptions = {},
): Promise<ServiceRef> {
  const all = await loadServices(client);

  let pool = all;
  if (options.kind) {
    pool = pool.filter((service) => service.kind === options.kind);
  }
  if (options.project) {
    const project = options.project.trim().toLowerCase();
    pool = pool.filter((service) => service.projectName.toLowerCase().includes(project));
  }

  const needle = query.trim().toLowerCase();

  const byId = pool.find((service) => service.id === query.trim());
  if (byId) return byId;

  const tiers = [
    pool.filter((service) => service.name.toLowerCase() === needle),
    pool.filter((service) => service.name.toLowerCase().startsWith(needle)),
    pool.filter((service) => service.name.toLowerCase().includes(needle)),
  ];

  const matches = tiers.find((tier) => tier.length > 0) ?? [];

  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    throw new Error(
      `“${query}” matches several services: ${matches.map(describeCandidate).join("; ")}. ` +
        `Ask the user which one they mean, then call again with the project name or the service id.`,
    );
  }

  const available = pool.length > 0 ? pool.map(describeCandidate).join("; ") : "none";
  throw new Error(`No service matching “${query}”. Available services: ${available}.`);
}

/**
 * The shape services are handed to the model in.
 *
 * Deliberately a curated allowlist rather than the raw row: for owners and admins Dokploy returns
 * `env`, `buildSecrets` and database passwords on these objects, and anything returned here can end
 * up quoted back into a chat transcript. Secrets never leave the API layer.
 */
export interface ServiceSummary {
  id: string;
  name: string;
  type: string;
  kind: ServiceKind;
  status: string;
  project: string;
  environment: string;
  description?: string;
}

export function summarizeService(service: ServiceRef): ServiceSummary {
  return {
    id: service.id,
    name: service.name || serviceKindConfig(service.kind).label,
    type: serviceKindConfig(service.kind).label,
    kind: service.kind,
    status: service.status ?? "unknown",
    project: service.projectName,
    environment: service.environmentName,
    ...(service.description ? { description: service.description } : {}),
  };
}
