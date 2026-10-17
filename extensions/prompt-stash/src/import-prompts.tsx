import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { readFile } from "fs/promises";
import { Prompt } from "./types";
import { PROMPTS_KEY, parseExportFile } from "./utils/transfer";

type Strategy = "skip" | "replace" | "duplicate";

interface ImportFormValues {
  files: string[];
  strategy: string;
}

export default function Command() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ImportFormValues>({
    initialValues: { files: [], strategy: "skip" },
    validation: {
      files: FormValidation.Required,
    },
    async onSubmit({ files, strategy: strategyValue }) {
      const strategy = strategyValue as Strategy;
      try {
        const fileContent = await readFile(files[0], "utf-8");
        const imported = parseExportFile(fileContent);

        const stored = await LocalStorage.getItem<string>(PROMPTS_KEY);
        const existing: Prompt[] = stored ? JSON.parse(stored) : [];
        const existingById = new Map(existing.map((p) => [p.id, p]));

        let added = 0;
        let replaced = 0;
        let skipped = 0;
        const merged: Prompt[] = [...existing];

        for (let i = 0; i < imported.length; i++) {
          const prompt = imported[i];
          if (existingById.has(prompt.id)) {
            if (strategy === "replace") {
              const idx = merged.findIndex((p) => p.id === prompt.id);
              merged[idx] = prompt;
              replaced++;
            } else if (strategy === "duplicate") {
              merged.push({ ...prompt, id: `${Date.now()}-${i}` });
              added++;
            } else {
              skipped++;
            }
          } else {
            merged.push(prompt);
            added++;
          }
        }

        await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(merged));

        await showToast({
          style: Toast.Style.Success,
          title: "Import complete",
          message: `${added} added · ${replaced} replaced · ${skipped} skipped`,
        });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Prompts" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.files}
        title="Export File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.Dropdown {...itemProps.strategy} title="If Prompt Already Exists">
        <Form.Dropdown.Item value="skip" title="Skip Duplicates" icon={Icon.Forward} />
        <Form.Dropdown.Item value="replace" title="Replace Existing" icon={Icon.Repeat} />
        <Form.Dropdown.Item value="duplicate" title="Import as New" icon={Icon.PlusCircle} />
      </Form.Dropdown>
      <Form.Description
        title="About"
        text="Import prompts from a JSON file previously exported by Prompt Stash. Existing prompts are matched by their unique ID."
      />
    </Form>
  );
}
