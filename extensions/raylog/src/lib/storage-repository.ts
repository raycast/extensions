import { nanoid } from "nanoid";
import { RaylogTaskNotFoundError, RaylogWorkLogNotFoundError } from "./storage-errors";
import { readStorageDocument, readStorageMarkdown, writeStorageDocument } from "./storage-markdown";
import { isRaylogDocument, parseRaylogMarkdown } from "./storage-schema";
import type {
  RaylogDocument,
  TaskInput,
  TaskListViewMode,
  TaskRecord,
  TaskStatus,
  TaskViewFilter,
  TaskWorkLogInput,
  TaskWorkLogRecord,
} from "./types";

export class RaylogRepository {
  private pendingMutation = Promise.resolve();

  constructor(private readonly notePath: string) {}

  async listTasks(): Promise<TaskRecord[]> {
    return (await this.readDocument()).tasks;
  }

  async getListTasksFilter(): Promise<TaskViewFilter> {
    const { viewState } = await this.readDocument();
    return viewState.hasSelectedListTasksFilter ? viewState.listTasksFilter : "open";
  }

  async setListTasksFilter(filter: TaskViewFilter): Promise<void> {
    await this.mutateDocument((document) => ({
      ...document,
      viewState: {
        ...document.viewState,
        hasSelectedListTasksFilter: true,
        listTasksFilter: filter,
      },
    }));
  }

  async getListViewMode(): Promise<TaskListViewMode> {
    const { viewState } = await this.readDocument();
    return viewState.hasSelectedListViewMode ? viewState.listViewMode : "summary";
  }

  async setListViewMode(viewMode: TaskListViewMode): Promise<void> {
    await this.mutateDocument((document) => ({
      ...document,
      viewState: {
        ...document.viewState,
        hasSelectedListViewMode: true,
        listViewMode: viewMode,
      },
    }));
  }

  async getTask(taskId: string): Promise<TaskRecord> {
    const document = await this.readDocument();
    const task = document.tasks.find((candidate) => candidate.id === taskId);

    if (!task) {
      throw new RaylogTaskNotFoundError("The selected task could not be found.");
    }

    return task;
  }

  async createTask(input: TaskInput): Promise<TaskRecord> {
    let createdTask: TaskRecord | undefined;

    await this.mutateDocument((document) => {
      const now = new Date().toISOString();
      const status = input.status ?? "todo";
      const task: TaskRecord = {
        id: nanoid(),
        header: input.header.trim(),
        body: input.body?.trim() ?? "",
        workLogs: [],
        status,
        dueDate: input.dueDate ?? null,
        startDate: input.startDate ?? null,
        completedAt: status === "done" ? now : null,
        createdAt: now,
        updatedAt: now,
      };

      createdTask = task;
      return { ...document, tasks: [...document.tasks, task] };
    });

    return createdTask!;
  }

  async updateTask(taskId: string, input: TaskInput): Promise<TaskRecord> {
    let updatedTask: TaskRecord | undefined;

    await this.mutateDocument((document) => {
      const now = new Date().toISOString();
      const tasksWithTaskUpdate = document.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        updatedTask = {
          ...task,
          header: input.header.trim(),
          body: input.body?.trim() ?? "",
          workLogs: input.workLogs ?? task.workLogs,
          status: input.status ?? task.status,
          dueDate: input.dueDate ?? null,
          startDate: input.startDate ?? null,
          completedAt: deriveCompletedAt(task, input.status ?? task.status, now),
          updatedAt: now,
        };

        return updatedTask;
      });

      if (!updatedTask) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      return { ...document, tasks: tasksWithTaskUpdate };
    });

    return updatedTask!;
  }

  async completeTask(taskId: string): Promise<TaskRecord> {
    return this.updateTaskStatus(taskId, "done");
  }

  async startTask(taskId: string): Promise<TaskRecord> {
    return this.updateTaskStatus(taskId, "in_progress");
  }

  async reopenTask(taskId: string): Promise<TaskRecord> {
    return this.updateTaskStatus(taskId, "todo");
  }

  async archiveTask(taskId: string): Promise<TaskRecord> {
    return this.updateTaskStatus(taskId, "archived");
  }

  async deleteTask(taskId: string): Promise<void> {
    let didDelete = false;

    await this.mutateDocument((document) => {
      const tasks = document.tasks.filter((task) => {
        if (task.id !== taskId) {
          return true;
        }

        didDelete = true;
        return false;
      });

      if (!didDelete) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      return { ...document, tasks };
    });
  }

  async createWorkLog(taskId: string, input: TaskWorkLogInput): Promise<TaskWorkLogRecord> {
    let createdWorkLog: TaskWorkLogRecord | undefined;

    await this.mutateDocument((document) => {
      const now = new Date().toISOString();
      const tasks = document.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        createdWorkLog = {
          id: nanoid(),
          body: input.body.trim(),
          createdAt: now,
          updatedAt: null,
        };

        return {
          ...task,
          workLogs: [...task.workLogs, createdWorkLog],
          updatedAt: now,
        };
      });

      if (!createdWorkLog) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      return { ...document, tasks };
    });

    return createdWorkLog!;
  }

  async updateWorkLog(taskId: string, workLogId: string, input: TaskWorkLogInput): Promise<TaskWorkLogRecord> {
    let updatedWorkLog: TaskWorkLogRecord | undefined;

    await this.mutateDocument((document) => {
      const now = new Date().toISOString();
      let didFindTask = false;
      const tasks = document.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        didFindTask = true;
        const workLogs = task.workLogs.map((workLog) => {
          if (workLog.id !== workLogId) {
            return workLog;
          }

          updatedWorkLog = {
            ...workLog,
            body: input.body.trim(),
            updatedAt: now,
          };

          return updatedWorkLog;
        });

        if (!updatedWorkLog) {
          return task;
        }

        return {
          ...task,
          workLogs,
          updatedAt: now,
        };
      });

      if (!didFindTask) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      if (!updatedWorkLog) {
        throw new RaylogWorkLogNotFoundError("The selected work log could not be found.");
      }

      return { ...document, tasks };
    });

    return updatedWorkLog!;
  }

  async deleteWorkLog(taskId: string, workLogId: string): Promise<void> {
    await this.mutateDocument((document) => {
      const now = new Date().toISOString();
      let didFindTask = false;
      let didDeleteWorkLog = false;
      const tasks = document.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        didFindTask = true;
        const workLogs = task.workLogs.filter((workLog) => {
          if (workLog.id !== workLogId) {
            return true;
          }

          didDeleteWorkLog = true;
          return false;
        });

        if (!didDeleteWorkLog) {
          return task;
        }

        return {
          ...task,
          workLogs,
          updatedAt: now,
        };
      });

      if (!didFindTask) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      if (!didDeleteWorkLog) {
        throw new RaylogWorkLogNotFoundError("The selected work log could not be found.");
      }

      return { ...document, tasks };
    });
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskRecord> {
    let completedTask: TaskRecord | undefined;
    const now = new Date().toISOString();

    await this.mutateDocument((document) => {
      const tasks = document.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        completedTask = {
          ...task,
          status,
          completedAt: deriveCompletedAt(task, status, now),
          updatedAt: now,
        };

        return completedTask;
      });

      if (!completedTask) {
        throw new RaylogTaskNotFoundError("The selected task could not be found.");
      }

      return { ...document, tasks };
    });

    return completedTask!;
  }

  private async readDocument(): Promise<RaylogDocument> {
    return readStorageDocument(this.notePath);
  }

  private async mutateDocument<T>(transform: (document: RaylogDocument) => T): Promise<T> {
    const runMutation = async (): Promise<T> => {
      const markdown = await readStorageMarkdown(this.notePath);
      const { document } = parseRaylogMarkdown(markdown);
      const result = transform(document);
      const updatedDocument = isRaylogDocument(result) ? result : document;

      if (updatedDocument !== document) {
        await writeStorageDocument(this.notePath, markdown, updatedDocument);
      }

      return result;
    };

    const nextMutation = this.pendingMutation.then(runMutation, runMutation);
    this.pendingMutation = nextMutation.then(
      () => undefined,
      () => undefined,
    );
    return nextMutation;
  }
}

function deriveCompletedAt(task: TaskRecord, status: TaskStatus, now: string): string | null {
  if (status === "done") {
    return task.completedAt ?? now;
  }

  if (status === "archived") {
    return task.completedAt;
  }

  return null;
}
