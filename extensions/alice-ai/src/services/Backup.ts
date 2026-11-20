import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { AvailableModels } from "../lib/OpenAI";
import { useActionsState } from "../store/actions";
import { Action } from "../types";
import { Infinity32Bit } from "../utils";

interface BackupData {
  name: "alice-ai-config";
  version: number;
  actions: Action[];
}

interface AppleScriptError {
  message: string;
  stderr: string;
}

function isValidAction(action: Action): boolean {
  const textFields: (keyof Action)[] = ["id", "name", "description", "systemPrompt", "model", "color", "temperature", "maxTokens"];
  if (
    !action ||
    !textFields.every((field) => typeof action[field] === "string") ||
    typeof action.favorite !== "boolean" ||
    (action.reasoningLevel !== undefined && typeof action.reasoningLevel !== "string")
  ) {
    return false;
  }

  const temperature = Number(action.temperature);
  const maxTokens = Number(action.maxTokens);
  return (
    action.id.trim().length > 0 &&
    action.temperature.trim().length > 0 &&
    Number.isFinite(temperature) &&
    temperature >= 0 &&
    temperature <= 1 &&
    Number.isSafeInteger(maxTokens) &&
    (maxTokens === -1 || maxTokens > 0)
  );
}

function isValidActions(actions: unknown): actions is Action[] {
  return Array.isArray(actions) && actions.every(isValidAction) && new Set(actions.map((action) => action.id)).size === actions.length;
}

export default class Backup {
  public static async export(): Promise<void> {
    const actions = useActionsState.getState().actions;
    const data = {
      name: "alice-ai-config",
      version: useActionsState.persist.getOptions().version as number,
      actions,
    };

    const json = JSON.stringify(data, null, 2);

    try {
      await runAppleScript(
        `
        on run argv
          set jsonFile to choose file name with prompt "Save the document as:" default name "alice-ai.config.json"
          set filePath to POSIX path of jsonFile
          set fileDescriptor to open for access POSIX file filePath with write permission
          set eof of fileDescriptor to 0
          set encoding to "utf8"
          set text item delimiters to ""
          write (item 1 of argv as text) to fileDescriptor as «class utf8»
          close access fileDescriptor
        end run
      `,
        [json],
        {
          timeout: Infinity32Bit,
        },
      );

      showToast({
        title: "Actions has been exported",
        message: "The actions has been exported successfully.",
        style: Toast.Style.Success,
      });
    } catch (e) {
      const error = e as AppleScriptError;
      if (error.stderr.includes("-128")) {
        return;
      }

      showToast({
        title: "Error",
        message: "An error occurred while exporting actions.",
        style: Toast.Style.Failure,
      });
    }
  }

  public static async import(): Promise<void> {
    try {
      const res = await runAppleScript(
        `
        set jsonFile to choose file with prompt "Choose the Alice AI Actions Config to import."
        set jsonContent to (read jsonFile as «class utf8»)
      `,
        {
          timeout: Infinity32Bit,
        },
      );

      try {
        const { name, actions, version } = JSON.parse(res) as BackupData;

        const currentVersion = useActionsState.persist.getOptions().version ?? 0;
        if (
          name !== "alice-ai-config" ||
          !Number.isInteger(version) ||
          version < 1 ||
          version > currentVersion ||
          !isValidActions(actions)
        ) {
          throw new Error("Invalid or unsupported backup file. Your saved actions have not been changed.");
        }

        const actionState = {
          actions: actions,
        };

        const migratedState = (await useActionsState.persist.getOptions().migrate?.(actionState, version)) ?? actionState;
        if (
          !migratedState ||
          typeof migratedState !== "object" ||
          !("actions" in migratedState) ||
          !isValidActions(migratedState.actions) ||
          !migratedState.actions.every((action) => Object.hasOwn(AvailableModels, action.model))
        ) {
          throw new Error("Invalid or unsupported backup file. Your saved actions have not been changed.");
        }

        useActionsState.setState({ actions: migratedState.actions });

        showToast({
          title: "Actions has been imported",
          message: "The actions has been imported successfully.",
          style: Toast.Style.Success,
        });
      } catch (error) {
        const e = error as Error;

        showToast({
          title: "Error",
          message: e.message || "An error occurred while importing actions.",
          style: Toast.Style.Failure,
        });
      }
    } catch (e) {
      const error = e as AppleScriptError;
      if (error.stderr.includes("-128")) {
        return;
      }

      showToast({
        title: "Error",
        message: "An error occurred while importing actions.",
        style: Toast.Style.Failure,
      });
    }
  }
}
