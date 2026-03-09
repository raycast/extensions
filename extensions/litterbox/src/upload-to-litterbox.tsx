import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedFinderItems,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { uploadFile, EXPIRY_OPTIONS, type ExpiryTime } from "./lib/api";
import { addRecentUpload } from "./lib/storage";
import * as path from "path";

async function getFinderSelectionPaths(): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((i) => i.path);
  } catch {
    return [];
  }
}

interface FormValues {
  file: string[];
  time: string;
}

function UploadForm() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { time: "24h" },
    onSubmit: async (values) => {
      const files = values.file?.filter(Boolean);
      if (!files?.length) {
        await showToast(Toast.Style.Failure, "Please select at least one file");
        return;
      }

      const toast = await showToast(Toast.Style.Animated, `Uploading ${files.length} file(s)...`);

      try {
        const expiry = values.time as ExpiryTime;
        for (const filePath of files) {
          const url = await uploadFile(filePath, expiry);
          const filename = path.basename(filePath);
          await addRecentUpload({
            url,
            time: expiry,
            uploadedAt: Date.now(),
            filename,
          });
          await Clipboard.copy(url);
          await showToast(Toast.Style.Success, filename, "URL copied to clipboard");
        }
        pop();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = message;
      }
    },
    validation: {
      file: (value) => (!value?.length ? "Select at least one file" : undefined),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="File" {...itemProps.file} allowMultipleSelection />
      <Form.Dropdown title="Expires in" {...itemProps.time}>
        {EXPIRY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function UploadFromFinderPaths({ paths }: { paths: string[] }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ time: string }>({
    initialValues: { time: "24h" },
    onSubmit: async (values) => {
      const toast = await showToast(Toast.Style.Animated, `Uploading ${paths.length} file(s)...`);

      try {
        const expiry = values.time as ExpiryTime;
        for (const filePath of paths) {
          const url = await uploadFile(filePath, expiry);
          const filename = path.basename(filePath);
          await addRecentUpload({
            url,
            time: expiry,
            uploadedAt: Date.now(),
            filename,
          });
          await Clipboard.copy(url);
          await showToast(Toast.Style.Success, filename, "URL copied to clipboard");
        }
        pop();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = message;
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Finder selection" text={`${paths.length} file(s) selected`} />
      <Form.Dropdown title="Expires in" {...itemProps.time}>
        {EXPIRY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function UploadToLitterbox() {
  const { data: finderPaths, isLoading } = usePromise(getFinderSelectionPaths, []);

  if (isLoading) {
    return <Detail isLoading markdown="Checking Finder selection…" />;
  }

  if (finderPaths && finderPaths.length > 0) {
    return <UploadFromFinderPaths paths={finderPaths} />;
  }

  return <UploadForm />;
}

export default UploadToLitterbox;
