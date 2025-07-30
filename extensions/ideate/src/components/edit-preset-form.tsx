import { ActionPanel, Action, Form, showToast, Toast, getApplications, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPresets, savePreset, InitPreset, deletePreset } from "../utils/storage";

interface EditPresetFormProps {
  preset: InitPreset;
  onSave: () => Promise<void>;
}

export default function EditPresetForm({ preset, onSave }: EditPresetFormProps) {
  const [name, setName] = useState(preset.name);
  const [pathVal, setPath] = useState<string[]>(preset.path);
  const [command, setCommand] = useState(preset.command);
  const [apps, setApps] = useState<{ name: string; bundleId: string }[]>([]);
  const [selectedApp, setApp] = useState(preset.ideBundleId);
  const { pop } = useNavigation();

  useEffect(() => {
    getApplications().then((list) =>
      setApps(
        list
          .filter((app) => typeof app.bundleId === "string")
          .map((app) => ({ name: app.name, bundleId: app.bundleId as string })),
      ),
    );
  }, []);

  async function isPresetNameUniqueExceptSelf(name: string): Promise<boolean> {
    const existingPresets = await getPresets();
    return !existingPresets.some((p) => p.name === name && p.name !== preset.name);
  }

  async function handleSubmit() {
    // 如果名称被修改，检查名称是否唯一
    if (name !== preset.name && !(await isPresetNameUniqueExceptSelf(name))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preset name already exists",
        message: "Please choose a different name",
      });
      return;
    }

    // 检查预设名称
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preset name is required",
      });
      return;
    }

    // 检查是否选择了至少一个文件夹
    if (!pathVal || pathVal.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select at least one folder",
      });
      return;
    }

    // 检查是否选择了应用程序
    if (!selectedApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select an application",
      });
      return;
    }

    const updatedPreset: InitPreset = {
      name,
      path: pathVal,
      ideBundleId: selectedApp,
      command: command.trim(),
    };

    try {
      // 如果名称被修改，需要先删除旧预设
      if (name !== preset.name) {
        await deletePreset(preset.name);
      }

      await savePreset(updatedPreset);
      await showToast({ style: Toast.Style.Success, title: "Preset updated!" });
      await onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update preset",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Preset Name" value={name} onChange={setName} />
      <Form.FilePicker
        id="path"
        title="Project Base Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        value={pathVal}
        onChange={setPath}
      />
      <Form.Dropdown id="ideApp" title="IDE Application" value={selectedApp} onChange={setApp}>
        {apps.map((app) => (
          <Form.Dropdown.Item key={app.bundleId} value={app.bundleId} title={app.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="command"
        title="Initialization Command (Optional)"
        placeholder="example: git init"
        value={command}
        onChange={setCommand}
      />
    </Form>
  );
}
