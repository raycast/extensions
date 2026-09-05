import { ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";

export type TaskDestinationScope = Readonly<{
  backendId: TickTickBackend["id"];
  accountKey: string;
}>;

export interface TaskDestinationPreferencePort {
  load(scope: TaskDestinationScope): Promise<string | undefined>;
  remember(scope: TaskDestinationScope, projectId: string): Promise<void>;
}

export type TaskDestinationDependencies = Readonly<{
  scope: TaskDestinationScope;
  listProjects(): Promise<readonly Project[]>;
  preferences: TaskDestinationPreferencePort;
}>;

export type TaskDestinationContext = Readonly<{
  projects: readonly Project[];
  destination?: Project;
}>;

const NO_DESTINATION_MESSAGE = "TickTick did not expose an available task destination.";
const INVALID_CREATED_DESTINATION_MESSAGE = "TickTick returned an invalid created-task destination.";

export async function loadTaskDestinationContext(
  dependencies: TaskDestinationDependencies
): Promise<TaskDestinationContext> {
  const catalog = await dependencies.listProjects();
  const projects = normalizeProjectCatalog(catalog);

  let rememberedProjectId: string | undefined;
  try {
    rememberedProjectId = await dependencies.preferences.load(dependencies.scope);
  } catch {
    rememberedProjectId = undefined;
  }

  const preferred = isSafeOpaqueValue(rememberedProjectId)
    ? projects.find((project) => project.id === rememberedProjectId)
    : undefined;
  const destination = preferred ?? projects.find((project) => project.kind === "inbox");

  return Object.freeze(destination === undefined ? { projects } : { projects, destination });
}

export async function requireTaskDestination(dependencies: TaskDestinationDependencies): Promise<Project> {
  const context = await loadTaskDestinationContext(dependencies);
  if (context.destination === undefined) throw new ProtocolError(NO_DESTINATION_MESSAGE);
  return context.destination;
}

export async function rememberCreatedTaskDestination(
  preferences: TaskDestinationPreferencePort,
  scope: TaskDestinationScope,
  task: Pick<Task, "projectId">
): Promise<void> {
  let projectId: unknown;
  try {
    projectId = task.projectId;
  } catch {
    throw new ProtocolError(INVALID_CREATED_DESTINATION_MESSAGE);
  }

  if (!isSafeOpaqueValue(projectId)) throw new ProtocolError(INVALID_CREATED_DESTINATION_MESSAGE);
  await preferences.remember(scope, projectId);
}

function normalizeProjectCatalog(value: unknown): readonly Project[] {
  try {
    if (!Array.isArray(value)) throw new ProtocolError(NO_DESTINATION_MESSAGE);

    const projects: Project[] = [];
    for (const candidate of value) {
      const project = normalizeOpenProject(candidate);
      if (project !== undefined) projects.push(project);
    }
    return Object.freeze(projects);
  } catch {
    throw new ProtocolError(NO_DESTINATION_MESSAGE);
  }
}

function normalizeOpenProject(value: unknown): Project | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  try {
    if (Array.isArray(value)) return undefined;

    const candidate = value as Partial<Project>;
    const id = candidate.id;
    const name = candidate.name;
    const kind = candidate.kind;
    const closed = candidate.closed;

    if (
      !isSafeOpaqueValue(id) ||
      !isSafeProjectName(name) ||
      (kind !== "inbox" && kind !== "project") ||
      closed !== false
    ) {
      return undefined;
    }

    return Object.freeze({ id, name, kind, closed });
  } catch {
    return undefined;
  }
}

function isSafeProjectName(value: unknown): value is string {
  return isSafeOpaqueValue(value);
}

function isSafeOpaqueValue(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}
