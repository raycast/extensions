import { ActionPanel, Action, Form, showToast, Toast, getApplications, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPresets, savePreset, InitPreset } from "./utils/storage";
import { useTranslation } from "./utils/i18n";

export default function AddInitPreset() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pathVal, setPath] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [apps, setApps] = useState<{ name: string; bundleId: string }[]>([]);
  const [selectedApp, setApp] = useState("");
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

  async function isPresetNameUnique(name: string): Promise<boolean> {
    const existingPresets = await getPresets();
    return !existingPresets.some((preset) => preset.name === name);
  }

  async function handleSubmit() {
    if (!(await isPresetNameUnique(name))) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.preset.nameExists,
        message: t.preset.chooseName,
      });
      return;
    }

    // 检查预设名称
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.form.nameRequired,
      });
      return;
    }

    // 检查是否选择了至少一个文件夹
    if (!pathVal || pathVal.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.form.folderRequired,
      });
      return;
    }

    // 检查是否选择了应用程序
    if (!selectedApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.form.appRequired,
      });
      return;
    }

    const preset: InitPreset = {
      name,
      path: pathVal,
      ideBundleId: selectedApp,
      command: command.trim(),
    };

    try {
      await savePreset(preset);
      await showToast({ style: Toast.Style.Success, title: t.preset.saved });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.preset.saveFailed,
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.common.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.form.presetName} value={name} onChange={setName} />
      <Form.FilePicker
        id="path"
        title={t.form.baseFolder}
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        value={pathVal}
        onChange={setPath}
      />
      <Form.Dropdown id="ideApp" title={t.form.ideApp} value={selectedApp} onChange={setApp}>
        {apps.map((app) => (
          <Form.Dropdown.Item key={app.bundleId} value={app.bundleId} title={app.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="command"
        title={t.form.initCommand}
        placeholder="example: git init"
        value={command}
        onChange={setCommand}
      />
    </Form>
  );
}
