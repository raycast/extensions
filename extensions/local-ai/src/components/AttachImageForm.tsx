import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import path from "node:path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".heic"];

export function AttachImageForm(props: { onAttach: (path: string) => void }) {
  const { pop } = useNavigation();

  async function submit(values: { image: string[] }) {
    const [file] = values.image;
    if (!file) return;
    if (!IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a PNG, JPG, JPEG or HEIC image" });
      return;
    }
    props.onAttach(file);
    pop();
  }

  return (
    <Form
      navigationTitle="Attach Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Attach Image" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Applies to your next message only. PNG, JPG, JPEG or HEIC."
      />
    </Form>
  );
}
