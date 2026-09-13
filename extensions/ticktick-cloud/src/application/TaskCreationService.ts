import { AmbiguousMutationError, ProtocolError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import type { TaskRepository } from "../infrastructure/cache/TaskRepository";

export interface TaskCreationServiceDependencies {
  readonly backend: TickTickBackend;
  readonly backendId: TickTickBackend["id"];
  readonly repository: TaskRepository;
  readonly createSupported: boolean;
}

const CONFIRMATION_ERROR_MESSAGE = "Task creation status could not be confirmed.";
const INVALID_INPUT_MESSAGE = "TickTick task creation input is invalid.";

export class TaskCreationService {
  private readonly backend: TickTickBackend;
  private readonly backendId: TickTickBackend["id"];
  private readonly repository: TaskRepository;
  private readonly createSupported: boolean;

  constructor(dependencies: TaskCreationServiceDependencies) {
    this.backend = dependencies.backend;
    this.backendId = dependencies.backendId;
    this.repository = dependencies.repository;
    this.createSupported = dependencies.createSupported;
  }

  async create(accountKey: string, input: CreateTaskInput): Promise<Task> {
    if (!this.createSupported) throw new ProtocolError("This TickTick backend cannot create tasks.");

    const requestedProjectId = snapshotRequestedProjectId(input);
    let pending: Promise<Task>;
    try {
      const createTask = this.backend.createTask;
      pending = Reflect.apply(createTask, this.backend, [input]);
    } catch (error) {
      if (isAmbiguousMutation(error)) this.invalidateAccountSnapshots(accountKey);
      throw error;
    }

    let confirmed: Task;
    try {
      confirmed = await pending;
    } catch (error) {
      if (isAmbiguousMutation(error)) this.invalidateAccountSnapshots(accountKey);
      else if (isProtocolTypeError(error)) {
        this.invalidateAccountSnapshots(accountKey);
        throw new AmbiguousMutationError(CONFIRMATION_ERROR_MESSAGE);
      }
      throw error;
    }

    if (!isConfirmedTask(confirmed, requestedProjectId)) {
      this.invalidateAccountSnapshots(accountKey);
      throw new AmbiguousMutationError(CONFIRMATION_ERROR_MESSAGE);
    }

    this.invalidateAccountSnapshots(accountKey);
    return confirmed;
  }

  private invalidateAccountSnapshots(accountKey: string): void {
    try {
      this.repository.invalidateAccountSnapshots(this.backendId, accountKey);
    } catch {
      // A local cache is disposable and cannot change a confirmed or ambiguous remote outcome.
    }
  }
}

function snapshotRequestedProjectId(input: CreateTaskInput): string | undefined {
  let projectId: unknown;
  try {
    projectId = input.projectId;
  } catch {
    throw new ProtocolError(INVALID_INPUT_MESSAGE);
  }

  if (projectId === undefined) return undefined;
  if (!isSafeOpaqueValue(projectId)) throw new ProtocolError(INVALID_INPUT_MESSAGE);
  return projectId;
}

function isConfirmedTask(candidate: unknown, requestedProjectId: string | undefined): candidate is Task {
  try {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return false;
    const task = candidate as Partial<Task>;
    const id = task.id;
    const projectId = task.projectId;
    return (
      isSafeOpaqueValue(id) &&
      isSafeOpaqueValue(projectId) &&
      (requestedProjectId === undefined || projectId === requestedProjectId)
    );
  } catch {
    return false;
  }
}

function isSafeOpaqueValue(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;

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

function isAmbiguousMutation(error: unknown): boolean {
  try {
    return error instanceof AmbiguousMutationError;
  } catch {
    return false;
  }
}

function isProtocolTypeError(error: unknown): boolean {
  try {
    return error instanceof TypeError;
  } catch {
    return false;
  }
}
