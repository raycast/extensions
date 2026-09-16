import { ActionPanel, List, showToast, Toast } from "@raycast/api";
import type { ReactElement } from "react";

import { presentError } from "../application/errorPresentation";
import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import ConnectionActions, { type ConnectionActionHandler } from "./ConnectionActions";
import CreateTaskView from "./CreateTaskView";
import type { TaskFormFieldAvailability } from "./TaskForm";

export type CreateTaskRecoveryHandlers = Readonly<{
  onReconnect?: ConnectionActionHandler;
  onOpenPreferences?: ConnectionActionHandler;
  onRefresh?: ConnectionActionHandler;
  onRetry?: ConnectionActionHandler;
}>;

export type CreateTaskReadyRuntime = Readonly<{
  kind: "ready";
  contextKey: string;
  projects: readonly Project[];
  uiTimeZone: string;
  rememberedProjectId?: string;
  defaultTitle?: string;
  defaultDate?: Date | null;
  fieldAvailability?: Partial<TaskFormFieldAvailability>;
  createTask(input: CreateTaskInput): Promise<Task>;
  rememberProjectId?(projectId: string): void | Promise<void>;
}>;

export type CreateTaskRuntime =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "error"; error: unknown; recovery?: CreateTaskRecoveryHandlers }>
  | CreateTaskReadyRuntime;

export type CreateTaskCommandProps = Readonly<{ runtime: CreateTaskRuntime }>;

const fixedCreateFailure = "Task could not be created.";
const fixedAmbiguousCreateFailure = "Task creation status is unknown. Check TickTick before trying again.";

export function CreateTaskCommand({ runtime }: CreateTaskCommandProps): ReactElement {
  if (runtime.kind === "loading") return <List filtering={false} isLoading />;

  if (runtime.kind === "error") {
    const presentation = presentError(runtime.error, "read");
    return (
      <List filtering={false}>
        <List.EmptyView
          title={presentation.title}
          description={presentation.message}
          actions={
            <ActionPanel>
              <ConnectionActions presentation={presentation} {...runtime.recovery} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const mapCreateError = async (error: unknown): Promise<Error> => {
    const presentation = presentError(error, "mutation");
    await ignoreFailure(() =>
      showToast({ style: Toast.Style.Failure, title: presentation.title, message: presentation.message })
    );

    if (presentation.kind === "ambiguous-mutation") {
      return new AmbiguousMutationError(fixedAmbiguousCreateFailure);
    }
    return new Error(fixedCreateFailure);
  };

  const rememberProjectId = runtime.rememberProjectId;
  const onCreated = rememberProjectId
    ? async (_created: Task, confirmedProjectId: string): Promise<void> => {
        const projectId = safeProjectId(confirmedProjectId);
        if (projectId !== undefined) await rememberProjectId(projectId);
      }
    : undefined;

  return (
    <CreateTaskView
      contextKey={runtime.contextKey}
      projects={runtime.projects}
      uiTimeZone={runtime.uiTimeZone}
      rememberedProjectId={runtime.rememberedProjectId}
      defaultTitle={runtime.defaultTitle}
      defaultDate={runtime.defaultDate}
      fieldAvailability={runtime.fieldAvailability}
      createTask={(input) => runtime.createTask(input)}
      mapCreateError={mapCreateError}
      onCreated={onCreated}
    />
  );
}

function safeProjectId(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0 || value !== value.trim()) return undefined;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return undefined;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return undefined;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return undefined;
    }
  }
  return Array.from(value).some((character) => /\p{Cf}/u.test(character)) ? undefined : value;
}

async function ignoreFailure(operation: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    return;
  }
}

export default CreateTaskCommand;
