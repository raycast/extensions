import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { readRayconfigCommands } from "../lib/rayconfig";
import { loadCommands, upsertCommand } from "../lib/store";

interface Values {
  file: string[];
  password: string;
}

/** Imports AI Commands from a Raycast "Export Settings & Data" (.rayconfig) file. */
export function ImportForm({ onDone }: { onDone?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { file: [], password: "12345678" },
    validation: { file: FormValidation.Required, password: FormValidation.Required },
    async onSubmit(v) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Reading export…" });
      try {
        const incoming = await readRayconfigCommands(v.file[0], v.password);
        const existing = await loadCommands();
        const seen = new Set(existing.map((c) => `${c.title}\n${c.prompt}`));
        let added = 0;
        for (const cmd of incoming) {
          const sig = `${cmd.title}\n${cmd.prompt}`;
          if (seen.has(sig)) continue;
          seen.add(sig);
          await upsertCommand(cmd);
          added++;
        }
        toast.style = Toast.Style.Success;
        toast.title = added ? `Imported ${added} command${added === 1 ? "" : "s"}` : "Nothing new to import";
        toast.message = incoming.length - added ? `${incoming.length - added} already existed` : undefined;
        onDone?.();
        pop();
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Import failed";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    },
  });

  return (
    <Form
      navigationTitle="Import from Raycast Export"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Commands" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Raycast → Settings → Extensions → Raycast → Export Settings & Data. Pick the .rayconfig file it made." />
      <Form.FilePicker
        title="Export File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.file}
      />
      <Form.PasswordField
        title="Export Password"
        info="Raycast uses 12345678 unless you changed it when exporting."
        {...itemProps.password}
      />
    </Form>
  );
}
