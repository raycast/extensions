export const REGISTRY_URL = "https://registry.agentskit.io";
const INDEX_URL = `${REGISTRY_URL}/r/index.json`;
const SAFE_AGENT_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export type Agent = {
  id: string;
  title: string;
  description: string;
  category: string;
  version?: string;
  source?: string;
  license?: string;
  tags: string[];
  packages: string[];
  status?: string;
  installable: boolean;
  runnable: boolean;
  validation?: {
    status?: string;
    score?: number;
  };
};

export type RunnableAgentDefinition = {
  id: string;
  title: string;
  systemPrompt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function isSafeAgentId(value: string): boolean {
  return SAFE_AGENT_ID.test(value);
}

export function parseAgent(value: unknown): Agent | undefined {
  if (!isRecord(value)) return undefined;

  const id = getOptionalString(value.id);
  const title = getOptionalString(value.title);
  const description = getOptionalString(value.description);
  const category = getOptionalString(value.category);

  if (!id || !isSafeAgentId(id) || !title || !description || !category) return undefined;

  const validation = isRecord(value.validation)
    ? {
        status: getOptionalString(value.validation.status),
        score: typeof value.validation.score === "number" ? value.validation.score : undefined,
      }
    : undefined;

  return {
    id,
    title,
    description,
    category,
    version: getOptionalString(value.version),
    source: getOptionalString(value.source),
    license: getOptionalString(value.license),
    tags: getStringArray(value.tags),
    packages: getStringArray(value.packages),
    status: getOptionalString(value.status),
    installable: value.installable === true,
    runnable: value.runnable === true,
    validation,
  };
}

export function parseRunnableDefinition(value: unknown): RunnableAgentDefinition {
  if (!isRecord(value)) {
    throw new Error("The registry returned an invalid agent definition.");
  }

  const id = getOptionalString(value.id);
  const title = getOptionalString(value.title);
  const skill = isRecord(value.skill) ? value.skill : undefined;
  const systemPrompt = skill ? getOptionalString(skill.systemPrompt) : undefined;

  if (!id || !isSafeAgentId(id) || !title || !systemPrompt?.trim()) {
    throw new Error("This agent does not expose a portable prompt that Raycast can run safely.");
  }

  return { id, title, systemPrompt };
}

export async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch(INDEX_URL);
  if (!response.ok) {
    throw new Error(`Registry returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.agents)) {
    throw new Error("Registry returned an unexpected response");
  }

  return payload.agents
    .map(parseAgent)
    .filter((agent): agent is Agent => agent !== undefined)
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function fetchRunnableDefinition(agentId: string, signal?: AbortSignal): Promise<RunnableAgentDefinition> {
  const response = await fetch(agentDefinitionUrl(agentId), { signal });
  if (!response.ok) {
    throw new Error(`Registry returned ${response.status} for ${agentId}`);
  }

  const definition = parseRunnableDefinition(await response.json());
  if (definition.id !== agentId) {
    throw new Error(`Registry definition ID mismatch: expected ${agentId}, received ${definition.id}.`);
  }

  return definition;
}

export function agentPageUrl(agent: Pick<Agent, "id">): string {
  return `${REGISTRY_URL}/agents/${encodeURIComponent(agent.id)}`;
}

export function agentDefinitionUrl(agent: Pick<Agent, "id"> | string): string {
  const id = typeof agent === "string" ? agent : agent.id;
  return `${REGISTRY_URL}/r/${encodeURIComponent(id)}.json`;
}

export function installCommand(agent: Pick<Agent, "id">): string {
  if (!isSafeAgentId(agent.id)) {
    throw new Error("The registry returned an unsafe agent ID.");
  }
  return `npx agentskit add ${agent.id}`;
}
