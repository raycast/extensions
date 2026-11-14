import { Action, ActionPanel, Clipboard, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { getClient } from "./lib/api";
import { useMutation } from "./lib/hooks";

export default function UploadAsset({ onUploaded }: { onUploaded?: () => void }) {
  const mutation = useMutation();
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, reset } = useForm<{ file: string[]; filename: string }>({
    initialValues: { file: [], filename: "" },
    validation: { file: FormValidation.Required },
    onSubmit: async (values) => {
      await mutation.run(
        "Asset uploaded",
        async () => {
          const path = values.file[0];
          if (!path) throw new Error("Choose a file to upload");
          const info = await stat(path);
          if (!info.isFile() || !info.size || info.size > 30 * 1024 * 1024)
            throw new Error("Choose a non-empty file up to 30 MB");
          return getClient().uploadAsset(values.filename.trim() || basename(path), await readFile(path));
        },
        async (asset) => {
          await Clipboard.copy(asset.url);
          if (onUploaded) {
            onUploaded();
            pop();
          } else reset();
        },
      );
    },
  });
  return (
    <Form
      isLoading={mutation.isLoading}
      navigationTitle="Upload Asset"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Asset and Copy URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="File" allowMultipleSelection={false} canChooseDirectories={false} {...itemProps.file} />
      <Form.TextField title="Filename" placeholder="Use the original filename" {...itemProps.filename} />
      <Form.Description text="Upload a file up to 30 MB to CodePen Asset Hosting (PRO). Filenames must be unique. The asset URL will be copied to your clipboard." />
    </Form>
  );
}
