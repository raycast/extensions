import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createImage, ImageResult } from "./lib/images";
import { getConfig } from "./lib/config";
import ModelPicker from "./model-picker";
import SaveAs from "./save-as";

type Values = {
  prompt: string;
  images: string[];
  size: string;
  quality: string;
};
export default function Command(props: { initialImage?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { push } = useNavigation();
  async function submit(values: Values) {
    if (busy) return;
    if (!values.prompt.trim()) {
      setError("Enter an image prompt.");
      return;
    }
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating image…",
      message: "This may take several minutes",
    });
    try {
      const result = await createImage(await getConfig(), {
        prompt: values.prompt,
        imagePath: values.images[0],
        size: values.size,
        quality: values.quality,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Image saved";
      toast.message = undefined;
      push(<Result result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create image";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={busy ? "Creating Image…" : "Create Image"}
            icon={Icon.Stars}
            onSubmit={submit}
          />
          <Action.Push
            title="Choose Default Model"
            icon={Icon.Gear}
            target={<ModelPicker />}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose your image model using Choose Default Model in the action menu (⌘K) before your first generation." />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe an image, or what to change in a reference image…"
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.FilePicker
        id="images"
        title="Reference Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        defaultValue={props.initialImage ? [props.initialImage] : []}
        info="Optional PNG, JPEG, or WebP. Add an image to edit it."
      />
      <Form.Dropdown id="size" title="Size" defaultValue="default">
        <Form.Dropdown.Item value="default" title="Provider Default" />
        <Form.Dropdown.Item value="1024x1024" title="Square · 1024 × 1024" />
        <Form.Dropdown.Item value="1536x1024" title="Landscape · 1536 × 1024" />
        <Form.Dropdown.Item value="1024x1536" title="Portrait · 1024 × 1536" />
      </Form.Dropdown>
      <Form.Dropdown id="quality" title="Quality" defaultValue="default">
        {["default", "auto", "low", "medium", "high"].map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={
              value === "default"
                ? "Provider Default"
                : value[0].toUpperCase() + value.slice(1)
            }
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Images are sent to your configured API and saved locally. Size and quality support depends on the selected model." />
    </Form>
  );
}
function Result({ result }: { result: ImageResult }) {
  return (
    <Detail
      markdown={result.markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Image" target={result.path} />
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy({ file: result.path });
              await showToast({ title: "Image copied" });
            }}
          />
          <Action.ShowInFinder path={result.path} />
          <Action.Push
            title="Save as…"
            icon={Icon.Download}
            target={<SaveAs path={result.path} />}
          />
          <Action.Push
            title="Edit This Image"
            icon={Icon.Pencil}
            target={<Command initialImage={result.path} />}
          />
          <Action.CopyToClipboard
            title="Copy Image Path"
            content={result.path}
          />
        </ActionPanel>
      }
    />
  );
}
