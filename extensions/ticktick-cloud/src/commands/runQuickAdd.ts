import { AmbiguousMutationError, ProtocolError, ValidationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";

const CONFIRMATION_ERROR_MESSAGE = "Task creation status could not be confirmed.";

export async function runQuickAdd(
  dependencies: {
    createTask(input: CreateTaskInput): Promise<Task>;
    resolveDestination(): Promise<Project>;
  },
  input: { title: string; description?: string }
): Promise<{ title: "Task Added"; projectName: string }> {
  const title = input.title.trim();
  if (!title) throw new ValidationError("A task title is required.");

  const destination = normalizeOpenProject(await dependencies.resolveDestination());
  if (destination === undefined) {
    throw new ProtocolError("TickTick returned an invalid task destination.");
  }

  const description = input.description?.trim();
  const createInput: CreateTaskInput = {
    title,
    ...(description ? { description } : {}),
    projectId: destination.id,
  };
  const confirmed = await dependencies.createTask(createInput);
  const confirmation = confirmedTaskIdentity(confirmed);

  if (confirmation === undefined || confirmation.projectId !== destination.id) {
    throw new AmbiguousMutationError(CONFIRMATION_ERROR_MESSAGE);
  }

  return { title: "Task Added", projectName: destination.name };
}

function normalizeOpenProject(value: unknown): Project | undefined {
  if (!value || typeof value !== "object") return undefined;

  try {
    const project = value as Partial<Project>;
    const id = project.id;
    const name = project.name;
    const kind = project.kind;
    const closed = project.closed;
    return typeof id === "string" &&
      id.trim().length > 0 &&
      typeof name === "string" &&
      name.trim().length > 0 &&
      (kind === "inbox" || kind === "project") &&
      closed === false
      ? Object.freeze({ id, name, kind, closed })
      : undefined;
  } catch {
    return undefined;
  }
}

function confirmedTaskIdentity(value: unknown): Pick<Task, "id" | "projectId"> | undefined {
  if (!value || typeof value !== "object") return undefined;

  try {
    const task = value as Partial<Task>;
    const id = task.id;
    const projectId = task.projectId;
    return typeof id === "string" &&
      id.trim().length > 0 &&
      typeof projectId === "string" &&
      projectId.trim().length > 0
      ? { id, projectId }
      : undefined;
  } catch {
    return undefined;
  }
}
