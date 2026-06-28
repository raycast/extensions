import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
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

        if (name !== "alice-ai-config" && version === undefined) {
          throw new Error("Invalid backup file.");
        }

        const actionState = {
          actions: actions,
        };

        const migratedActions = useActionsState.persist.getOptions().migrate?.(actionState, version) as typeof actionState;
        useActionsState.setState(migratedActions);

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
