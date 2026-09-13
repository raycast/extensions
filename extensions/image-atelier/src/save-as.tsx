import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { basename, dirname } from "node:path";
import { saveCopy } from "./lib/save-copy";
export default function SaveAs({ path }: { path: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Image as"
            onSubmit={async (values: {
              directory: string[];
              filename: string;
            }) => {
              try {
                await saveCopy(
                  path,
                  values.directory[0] || "",
                  values.filename,
                );
                await showToast({ title: "Image copy saved" });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save image",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Destination"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        defaultValue={[dirname(path)]}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        defaultValue={basename(path)}
      />
      <Form.Description text="Save a copy with a new name or in another folder. The original image is kept." />
    </Form>
  );
}
