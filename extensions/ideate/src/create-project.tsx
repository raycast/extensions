import { ActionPanel, Action, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync } from "fs";
import { exec } from "child_process";
import { getPresets, InitPreset } from "./utils/storage";
import { useTranslation } from "./utils/i18n";

export default function CreateProject() {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<InitPreset[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPresets() {
      try {
        const loadedPresets = await getPresets();
        setPresets(loadedPresets);
        if (loadedPresets.length > 0) {
          setSelected(loadedPresets[0].name);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.preset.loadFailed,
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPresets();
  }, []);

  async function handleSubmit() {
    const preset = presets.find((p) => p.name === selected);
    if (!preset) {
      await showToast({ style: Toast.Style.Failure, title: t.project.noPreset });
      return;
    }
    if (!projectName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: t.project.needName });
      return;
    }

    try {
      const basePath = preset.path[0];
      const targetDir = join(basePath.replace(/^~(?=$|\/|\\)/, homedir()), projectName);

      // 创建项目目录
      mkdirSync(targetDir, { recursive: true });

      // 只有在命令非空时才执行初始化命令
      if (preset.command && preset.command.trim()) {
        await new Promise<void>((resolve, reject) => {
          exec(preset.command, { cwd: targetDir }, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // 用指定应用打开项目
      await new Promise<void>((resolve, reject) => {
        exec(`open -b "${preset.ideBundleId}" "${targetDir}"`, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      await showToast({
        style: Toast.Style.Success,
        title: t.project.created,
        message: targetDir,
      });

      // 关闭命令窗口
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.project.failed,
        message: String(error),
      });
    }

    popToRoot();
  }

  // 获取选中预设的详情
  const selectedPreset = presets.find((p) => p.name === selected);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.project.create} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="projectName" title={t.project.name} value={projectName} onChange={setProjectName} />

      <Form.Dropdown id="preset" title={t.project.selectPreset} value={selected} onChange={setSelected}>
        {presets.map((p) => (
          <Form.Dropdown.Item key={p.name} value={p.name} title={p.name} />
        ))}
      </Form.Dropdown>

      {selectedPreset && (
        <Form.Description
          title={t.preset.details}
          text={`${t.common.path}: ${selectedPreset.path[0].replace(/^~(?=$|\/|\\)/, homedir())}\n${t.common.command}: ${selectedPreset.command}`}
        />
      )}
    </Form>
  );
}
