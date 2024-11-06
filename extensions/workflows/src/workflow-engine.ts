import { Clipboard, launchCommand, AI, open, getSelectedText, BrowserExtension } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { StepDefinition, STEP_TYPES, WorkflowDefinition } from "./workflow-definition";
import {EventEmitterAsyncResource} from "node:events";


/**
 * @description will replace the `{Dynamic Placeholders}`
 */
export async function interpolate(toInterpolate: string, escapeForJson: boolean = false) {
  const escape = (str: string = "") => escapeForJson ? JSON.stringify(str).slice(1, -1) : str;

  let result = toInterpolate;

  /**
   * @description Will check if `toInterpolate` has the `searchValue`, 
   * if so it replaces that with the outcome of the `resolver`.
   */
  async function doInterpolate(searchValue: string, resolver: () => Promise<string | undefined>) {
    if (!toInterpolate.includes(searchValue)) return;

    const resolved = await resolver().catch(() => "");

    result = result.replaceAll(searchValue, escape(resolved));
  }

  await doInterpolate("{clipboard}", Clipboard.readText);
  await doInterpolate("{selected-text}", getSelectedText);
  await doInterpolate("{browser-content-html}", () => BrowserExtension.getContent({ format: "html" }));
  await doInterpolate("{browser-content-markdown}", () => BrowserExtension.getContent({ format: "markdown" }));
  await doInterpolate("{browser-content-text}", () => BrowserExtension.getContent({ format: "text" }));
  
  return result;
}

export async function runStep(step: StepDefinition): Promise<void> {
  switch (step.type) {
    case STEP_TYPES.OPEN: {
      await open(await interpolate(step.argument));
      break;
    }

    /* This might just be optional... */
    case STEP_TYPES.OPEN_DEEPLINK: {
      await open(await interpolate(step.argument), "raycast");
      break;
    }

    case STEP_TYPES.ASK_AI: {
      const response = await AI.ask(await interpolate(step.argument));

      console.log("AI resonded with:", response);

      if (step.writeToClipboard) {
        await Clipboard.copy(response);
      }

      break;
    }

    case STEP_TYPES.APPLE_SCRIPT: {
      await runAppleScript(await interpolate(step.argument));
      break;
    }

    case STEP_TYPES.LAUNCH_COMMAND: {
      const stepArgs = JSON.parse(
        await interpolate(JSON.stringify(step.arguments), true)
      );

      await launchCommand({
        ownerOrAuthorName: step.ownerOrAuthorName,
        extensionName: step.extensionName,
        name: step.commandName,
        type: step.launchType,
        arguments: stepArgs,
      });

      break;
    }
  }
}

export type StepState = "WAITING" | "RUNNING" | "COMPLETED" | "FAILED";
export type StepWithState = { step: StepDefinition, state: StepState, error?: Error};
export type Progress = StepWithState[];

export default class WorkflowEngine extends EventEmitterAsyncResource {
  public progress: Progress;

  constructor(private workflow: WorkflowDefinition) {
    super();

    this.progress = workflow.steps.map(step => ({ step, state: "WAITING" }));
  }

  async start() {
    for (let i = 0; i < this.workflow.steps.length; i++) {
      const step = this.workflow.steps[i];

      this.progress[i].state = "RUNNING";
      this.emit("progress", this.progress, step, i);
      this.emit("stepStart", this.progress, step, i);

      try {
        await runStep(step);
        this.progress[i].state = "COMPLETED";
        this.emit("progress", this.progress, step, i);
      } catch(error) {
        console.error(error);
        this.progress[i].state = "FAILED";
        this.progress[i].error = new Error("Something went wrong.")
        this.emit("progress", this.progress, step, i);
      }

      this.emit("progress", this.progress);
    }

    this.emit("complete", this.progress);
  }
}
