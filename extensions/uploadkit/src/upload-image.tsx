import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Keyboard,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { UploadKitApiError, type UploadedImage, uploadImage } from "./lib/uploadkit";

interface FormValues {
  image: string[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function Result({ image }: { image: UploadedImage }) {
  const { pop } = useNavigation();
  const markdown = `# Upload complete

![${image.name}](${image.url})

\`${image.url}\`

**${image.name}** · ${formatBytes(image.size)} · ${image.type}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy URL" content={image.url} />
          <Action.OpenInBrowser title="Open Image in Browser" url={image.url} />
          <Action
            title="Upload Another Image"
            icon={Icon.ArrowLeft}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}

export default function UploadImageCommand() {
  const { apiKey } = getPreferenceValues<Preferences.UploadImage>();
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string>();

  async function handleSubmit(values: FormValues) {
    const filePath = values.image[0];
    if (!filePath) {
      setFieldError("Choose an image to upload.");
      return;
    }

    setFieldError(undefined);
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading Image",
      message: "Requesting a secure upload URL…",
    });

    try {
      const image = await uploadImage(filePath, apiKey);
      await Clipboard.copy(image.url);
      push(<Result image={image} />);
      toast.style = Toast.Style.Success;
      toast.title = "Image Uploaded";
      toast.message = "CDN URL copied to clipboard";
    } catch (error) {
      const apiError = error instanceof UploadKitApiError ? error : undefined;
      const message = error instanceof Error ? error.message : "The image could not be uploaded.";

      toast.style = Toast.Style.Failure;
      toast.title = "Upload Failed";
      toast.message = apiError?.suggestion ?? message;

      if (apiError?.status === 401) {
        toast.primaryAction = {
          title: "Open Extension Preferences",
          onAction: openExtensionPreferences,
        };
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={<Form.LinkAccessory target="https://app.uploadkit.dev" text="Open UploadKit Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Image" icon={Icon.Upload} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        error={fieldError}
        onChange={() => setFieldError(undefined)}
      />
      <Form.Description text="The image uploads directly to storage. Its CDN URL is copied automatically." />
    </Form>
  );
}
