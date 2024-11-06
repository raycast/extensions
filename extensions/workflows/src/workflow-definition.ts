import { environment, Icon, LaunchType } from "@raycast/api";
import path from "node:path";

import fs from "fs/promises";
import { UUID, randomUUID } from "node:crypto";

const definitionsPath = path.join(environment.supportPath, "definitions");
const definitionPath = (uuid: string) => path.join(definitionsPath, `${uuid}.json`);

export async function createEmptyWorkflow(): Promise<WorkflowDefinition> {
  const newWorkflow: WorkflowDefinition = {
    version: 1,
    uuid: randomUUID(),
    title: "New Workflow",
    icon: Icon.Airplane,
    description: "A new workflow",
    steps: [],
  };

  await writeWorkflowDefinition(newWorkflow);

  return newWorkflow;
}

export async function deleteWorkflow(uuid: string): Promise<void> {
  return fs.unlink(definitionPath(uuid));
}

export async function writeWorkflowDefinition(definition: WorkflowDefinition): Promise<void | Error> {
  await fs.mkdir(definitionsPath, { recursive: true });

  return fs
    .writeFile(definitionPath(definition.uuid), JSON.stringify(definition, null, 2))
    .catch((error) => (error instanceof Error ? error : new Error("Unknown error writing workflow definition")));
}

export async function getWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  return fs
    .readdir(definitionsPath)
    .then((files) =>
      Promise.allSettled(
        files
          .filter((file) => file.endsWith(".json"))
          .map(async (file) => {
            const content = await fs.readFile(path.join(definitionsPath, file), "utf-8");
            return readWorkflowDefinition(content);
          }),
      )
    )
    .then(results => 
      results
        .filter(res => res.status === "fulfilled")
        .map(res => res.value)
    )
    .catch((error) => {
      console.error("Error reading workflow definitions:", error);
      return [];
    });
}

export async function getWorkflowDefinition(uuid: string): Promise<WorkflowDefinition | undefined> {
  return fs
    .readFile(definitionPath(uuid), "utf-8")
    .then((json) => readWorkflowDefinition(json))
    .catch((e) => {
      console.error(e);
      return undefined;
    });
}

export function readWorkflowDefinition(json: string): WorkflowDefinition {
  const parsed = JSON.parse(json);

  // Validate the version
  if (parsed.version !== 1) throw new Error(`Unsupported workflow version: ${parsed.version}`);

  // Validate that all steps have required properties
  for (const step of parsed.steps) {
    step.type ||= STEP_TYPES.EMPTY;
    step.title ||= "No title"

    // Validate step type
    if (!Object.values(STEP_TYPES).includes(step.type)) {
      console.error(`Invalid step type: ${step.type}`);
      step.type = STEP_TYPES.EMPTY;
    }

    // Additional validation for specific step types
    switch (step.type) {
      case STEP_TYPES.LAUNCH_COMMAND:
        step.ownerOrAuthorName ||= "";
        step.extensionName ||= "";
        step.commandName ||= "";
        break;

      case STEP_TYPES.ASK_AI:
        if (typeof step.writeToClipboard !== "boolean") {
          step.writeToClipboard = false;
        }
        break;
    }
  }

  return {
    version: parsed.version,
    uuid: parsed.uuid,
    title: parsed.title,
    icon: parsed.icon || Icon.Airplane,
    description: parsed.description,
    steps: parsed.steps,
  };
}

/* -- WorkflowDefinition --*/
export type WorkflowDefinition = {
  version: 1;
  uuid: UUID;
  title: string;
  icon: string;
  description: string;
  steps: StepDefinition[];
};

export const STEP_TYPES = {
  EMPTY: "EMPTY",
  APPLE_SCRIPT: "APPLE_SCRIPT",
  OPEN: "OPEN",
  OPEN_DEEPLINK: "OPEN_DEEPLINK",
  LAUNCH_COMMAND: "LAUNCH_COMMAND",
  ASK_AI: "ASK_AI",
} as const;

export type StepTypes = (typeof STEP_TYPES)[keyof typeof STEP_TYPES];

type SharedStepDefinition = {
  type: StepTypes;
  title: string;
};

type EmptyDefinition = SharedStepDefinition & {
  type: "EMPTY";
};

type OpenStepDefinition = SharedStepDefinition & {
  type: "OPEN";

  argument: string;
};

type OpenDeeplinkStepDefinition = SharedStepDefinition & {
  type: "OPEN_DEEPLINK";

  argument: string;
};

type RunAppleScript = SharedStepDefinition & {
  type: "APPLE_SCRIPT";

  argument: string;
};

type AskAiDefinition = SharedStepDefinition & {
  type: "ASK_AI";

  argument: string;

  writeToClipboard: boolean;
};

export type LaunchCommandDefinition = SharedStepDefinition & {
  type: "LAUNCH_COMMAND";

  arguments?: null | { [item: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  ownerOrAuthorName: string;
  extensionName: string;
  commandName: string;
  launchType: LaunchType;
  context?: null | { [item: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  fallbackText?: string;
};

export type StepDefinition =
  | EmptyDefinition
  | OpenStepDefinition
  | OpenDeeplinkStepDefinition
  | AskAiDefinition
  | RunAppleScript 
  | LaunchCommandDefinition;

/* --- Icons --------------------------- */

export const ICON_BY_TYPE = {
  EMPTY: Icon.NewDocument,
  OPEN: Icon.Desktop,
  OPEN_DEEPLINK: Icon.Link,
  ASK_AI: Icon.Stars,
  LAUNCH_COMMAND: Icon.Play,
  APPLE_SCRIPT: Icon.CodeBlock,
} as Record<StepTypes, string>;

export const TITLE_BY_TYPE = {
  EMPTY: "Empty",
  OPEN: "Open",
  OPEN_DEEPLINK: "Open Raycast Deeplink",
  ASK_AI: "Ask AI",
  LAUNCH_COMMAND: "Launch Raycast Command",
  APPLE_SCRIPT: "Run Apple Script",
} as Record<StepTypes, string>;
