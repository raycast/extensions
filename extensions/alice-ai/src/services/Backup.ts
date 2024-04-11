import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { z } from "zod";
import { useActionsState } from "../store/actions";
import { Action } from "../types";
import { Infinity32Bit } from "../utils";

interface BackupDataV1 {
  name: "alice-ai-config";
  version: 1;
  actions: Action[];
}

type BackupData = BackupDataV1;

export default class Backup {
  public static async export(): Promise<void> {
    const actions = useActionsState.getState().actions;
    const data: BackupDataV1 = {
      name: "alice-ai-config",
      version: 1,
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
    } catch (error) {
      showToast({
        title: "Error",
        message: "An error occurred while exporting actions.",
        style: Toast.Style.Failure,
      });
    }
  }

  public static async import(): Promise<void> {
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
      const json = JSON.parse(res) as BackupData;

      if (json.name !== "alice-ai-config" && json.version === undefined) {
        throw new Error("Invalid backup file.");
      }

      switch (json.version) {
        case 1:
          await this.importVersion1(json);
          break;
        default:
          throw new Error("Unsupported config version.");
      }

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
  }

  private static async importVersion1(data: BackupDataV1): Promise<void> {
    const actionSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      systemPrompt: z.string(),
      model: z.enum(["gpt-3.5-turbo", "gpt-4-turbo-preview"]),
      temperature: z.string(),
      maxTokens: z.string(),
    });

    const actions = [];
    for (const action of data.actions) {
      actions.push(actionSchema.parse(action));
    }

    useActionsState.getState().replaceActions(actions);
  }
}
