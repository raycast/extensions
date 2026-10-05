import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { stat } from "node:fs/promises";
import { replaceFile, REPLACE_MIN_VERSION, type ReplaceTarget } from "../lib/replace";

type Values = { files: string[] };

/**
 * Picks the new file for Replace File. Aktar writes it at the same key, so
 * every link already shared shows the new file.
 */
export function ReplaceForm({ target, onReplaced }: { target: ReplaceTarget; onReplaced?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { files: [] },
    validation: {
      files: (value) => (value && value.length === 1 ? undefined : "Pick one file"),
    },
    async onSubmit(values) {
      const file = values.files[0];
      if (!(await stat(file).catch(() => undefined))?.isFile()) return false;
      const upload = await replaceFile(target, file);
      if (!upload) return false;
      onReplaced?.();
      pop();
    },
  });

  return (
    <Form
      navigationTitle={`Replace ${target.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace" icon={Icon.Repeat} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Replace"
        text={`${target.name} keeps its key and link; the new file takes its place. The destination's metadata removal and resizing apply, but not a format conversion. Needs ${REPLACE_MIN_VERSION} or later.`}
      />
      <Form.FilePicker
        title="New File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.files}
      />
    </Form>
  );
}
