import { isFullUuid, sanitizeShortcutLabel, SYSTEM_TARGETS, type CapturePosition, type CaptureType, type WorkflowyApiNode, type WorkflowyExportNode, type WorkflowyShortcut } from "./nodes";

const API_BASE = "https://workflowy.com";

function headers(apiKey: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function requestJson<T>(url: string, init: RequestInit, errorPrefix: string): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${errorPrefix} (${response.status}): ${message || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function exportNodes(apiKey: string): Promise<WorkflowyExportNode[]> {
  const response = await requestJson<{ items?: WorkflowyExportNode[]; nodes?: WorkflowyExportNode[] }>(
    `${API_BASE}/api/v1/nodes-export`,
    { method: "GET", headers: headers(apiKey) },
    "Workflowy export failed",
  );

  if (Array.isArray(response.nodes)) return response.nodes;
  if (Array.isArray(response.items)) return response.items;
  return [];
}

export async function listTargets(apiKey: string): Promise<WorkflowyShortcut[]> {
  const response = await requestJson<{ targets?: unknown[] }>(
    `${API_BASE}/api/v1/targets`,
    { method: "GET", headers: headers(apiKey) },
    "Listing Workflowy targets failed",
  );

  const normalized = (Array.isArray(response.targets) ? response.targets : [])
    .map((item) => normalizeShortcut(item))
    .filter((item): item is WorkflowyShortcut => Boolean(item));

  const existingNames = new Set(normalized.map((item) => item.name));
  for (const systemName of SYSTEM_TARGETS) {
    if (!existingNames.has(systemName)) {
      normalized.unshift({
        name: systemName,
        nodeId: null,
        isSystem: true,
        label: toDisplayLabel(systemName),
      });
    }
  }

  return normalized.sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

function normalizeShortcut(value: unknown): WorkflowyShortcut | null {
  if (!value || typeof value !== "object") return null;
  const target = value as Record<string, unknown>;
  const key = String(target.key ?? target.name ?? target.shortcut ?? target.target ?? "").trim();
  if (!key) return null;

  const maybeId = [target.node_id, target.nodeId, target.id, target.uuid].find((candidate) => typeof candidate === "string");
  const nodeId = typeof maybeId === "string" && isFullUuid(maybeId) ? maybeId : null;
  const isSystem =
    String(target.type ?? "").toLowerCase() === "system" ||
    Boolean(target.is_system ?? target.isSystem) ||
    (SYSTEM_TARGETS as readonly string[]).includes(key.toLowerCase());
  const rawLabel = String(target.label ?? target.title ?? target.display_name ?? target.displayName ?? target.name ?? toDisplayLabel(key));
  const label = sanitizeShortcutLabel(rawLabel) || toDisplayLabel(key);

  return {
    name: key,
    nodeId,
    isSystem,
    label,
  };
}

function toDisplayLabel(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export async function validateApiKey(apiKey: string): Promise<void> {
  await listTargets(apiKey);
}

export async function readTarget(apiKey: string, target: string, depth = 0): Promise<unknown> {
  const encodedTarget = encodeURIComponent(target);
  const url = `${API_BASE}/api/llm/doc/read/${encodedTarget}/?depth=${depth}`;
  return requestJson<unknown>(url, { method: "GET", headers: headers(apiKey) }, "Reading Workflowy node failed");
}

function toLayoutMode(type: CaptureType): "bullets" | "todo" {
  return type === "todo" ? "todo" : "bullets";
}

function collectUuids(value: unknown, results: string[]): void {
  if (typeof value === "string") {
    if (isFullUuid(value)) results.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectUuids(item, results);
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectUuids(nested, results);
    }
  }
}

export function extractFirstUuid(value: unknown): string | null {
  const matches: string[] = [];
  collectUuids(value, matches);
  return matches[0] ?? null;
}

export async function resolveTargetToNodeId(apiKey: string, target: string, fallbackNodeId?: string | null): Promise<string> {
  if (isFullUuid(target)) return target;
  if (fallbackNodeId && isFullUuid(fallbackNodeId)) return fallbackNodeId;

  const response = await readTarget(apiKey, target, 0);
  const nodeId = extractFirstUuid(response);
  if (!nodeId) {
    throw new Error(`Could not resolve Workflowy target \"${target}\" to a full UUID.`);
  }

  return nodeId;
}

export async function insertNode(apiKey: string, input: {
  target: string;
  targetNodeId?: string | null;
  text: string;
  note?: string;
  position: CapturePosition;
  type: CaptureType;
}): Promise<{ id: string | null; parentId: string | null }> {
  const parentId = input.targetNodeId && isFullUuid(input.targetNodeId) ? input.targetNodeId : isFullUuid(input.target) ? input.target : null;
  const response = await requestJson<{ item_id?: string }>(
    `${API_BASE}/api/v1/nodes`,
    {
      method: "POST",
      headers: headers(apiKey, true),
      body: JSON.stringify({
        parent_id: input.targetNodeId ?? input.target,
        name: input.text,
        note: input.note?.trim() || undefined,
        position: input.position,
        layoutMode: toLayoutMode(input.type),
      }),
    },
    "Creating Workflowy node failed",
  );

  return {
    id: response.item_id ?? null,
    parentId,
  };
}

export async function appendChild(apiKey: string, parentId: string, input: {
  text: string;
  note?: string;
  position: CapturePosition;
  type: CaptureType;
}): Promise<{ id: string | null; parentId: string }> {
  const response = await requestJson<{ item_id?: string }>(
    `${API_BASE}/api/v1/nodes`,
    {
      method: "POST",
      headers: headers(apiKey, true),
      body: JSON.stringify({
        parent_id: parentId,
        name: input.text,
        note: input.note?.trim() || undefined,
        position: input.position,
        layoutMode: toLayoutMode(input.type),
      }),
    },
    "Creating Workflowy node failed",
  );

  return {
    id: response.item_id ?? null,
    parentId,
  };
}

export async function listChildNodes(apiKey: string, parentIdOrTarget: string): Promise<WorkflowyApiNode[]> {
  const url = new URL(`${API_BASE}/api/v1/nodes`);
  url.searchParams.set("parent_id", parentIdOrTarget);

  const response = await requestJson<{ nodes?: WorkflowyApiNode[] }>(
    url.toString(),
    { method: "GET", headers: headers(apiKey) },
    "Listing Workflowy child nodes failed",
  );

  return (Array.isArray(response.nodes) ? response.nodes : []).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

export async function updateNode(apiKey: string, id: string, values: { text?: string; note?: string | null }): Promise<void> {
  await requestJson<{ status?: string }>(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: headers(apiKey, true),
      body: JSON.stringify({
        ...(values.text !== undefined ? { name: values.text } : {}),
        ...(values.note !== undefined ? { note: values.note } : {}),
      }),
    },
    "Updating Workflowy node failed",
  );
}

export async function setNodeCompleted(apiKey: string, id: string, completed: boolean): Promise<void> {
  await requestJson<{ status?: string }>(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(id)}/${completed ? "complete" : "uncomplete"}`,
    {
      method: "POST",
      headers: headers(apiKey),
    },
    `${completed ? "Completing" : "Uncompleting"} Workflowy node failed`,
  );
}

export async function moveNode(apiKey: string, id: string, parentId: string, position: CapturePosition): Promise<void> {
  await requestJson<{ status?: string }>(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(id)}/move`,
    {
      method: "POST",
      headers: headers(apiKey, true),
      body: JSON.stringify({ parent_id: parentId, position }),
    },
    "Moving Workflowy node failed",
  );
}

export async function deleteNode(apiKey: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/nodes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(apiKey),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Deleting Workflowy node failed (${response.status}): ${message || response.statusText}`);
  }
}
