import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import * as fs from "fs";
import { Provider } from "./types";
import { getPresetIconImage, PROVIDER_ICON_PRESETS } from "./providerIcons";

interface ProviderPresetIconListProps {
  provider: Provider;
  onSelectPreset: (presetId: string) => Promise<void>;
}

export function ProviderPresetIconList({
  provider,
  onSelectPreset,
}: ProviderPresetIconListProps) {
  const { pop } = useNavigation();

  async function handleSelect(presetId: string) {
    try {
      await onSelectPreset(presetId);
      showToast({
        style: Toast.Style.Success,
        title: "Provider icon updated",
      });
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update provider icon",
        message: String(e),
      });
    }
  }

  return (
    <List
      navigationTitle={`Preset Icons — ${provider.name}`}
      searchBarPlaceholder="Search preset icons..."
    >
      {PROVIDER_ICON_PRESETS.map((preset) => (
        <List.Item
          key={preset.id}
          icon={getPresetIconImage(preset)}
          title={preset.title}
          actions={
            <ActionPanel>
              <Action
                title="Use This Preset"
                icon={Icon.CheckCircle}
                onAction={() => handleSelect(preset.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface UploadProviderIconFormProps {
  provider: Provider;
  onUpload: (sourcePath: string) => Promise<void>;
}

export function UploadProviderIconForm({
  provider,
  onUpload,
}: UploadProviderIconFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { file: string[] }) {
    const sourcePath = values.file[0];
    if (!sourcePath) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please choose an image file",
      });
      return;
    }

    if (!fs.existsSync(sourcePath) || !fs.lstatSync(sourcePath).isFile()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Selected file does not exist",
      });
      return;
    }

    try {
      await onUpload(sourcePath);
      showToast({
        style: Toast.Style.Success,
        title: "Provider icon updated",
      });
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to upload provider icon",
        message: String(e),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Upload Icon — ${provider.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Icon" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Image File"
        allowMultipleSelection={false}
      />
      <Form.Description
        title="Supported Types"
        text="PNG, JPG, JPEG, WEBP, SVG"
      />
    </Form>
  );
}
