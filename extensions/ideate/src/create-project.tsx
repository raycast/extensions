import { ActionPanel, Action, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync } from "fs";
import { exec } from "child_process";
import { getPresets, InitPreset } from "./utils/storage";

export default function CreateProject() {
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
          title: "Failed to load presets",
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
      await showToast({ style: Toast.Style.Failure, title: "No preset selected" });
      return;
    }
    if (!projectName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Project name is required" });
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
        title: "Project created",
        message: targetDir,
      });

      // 关闭命令窗口
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project creation failed",
        message: String(error),
      });
    }

    popToRoot();
  }

  const selectedPreset = presets.find((p) => p.name === selected);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="projectName" title="Project Name" value={projectName} onChange={setProjectName} />

      <Form.Dropdown id="preset" title="Select Preset" value={selected} onChange={setSelected}>
        {presets.map((p) => (
          <Form.Dropdown.Item key={p.name} value={p.name} title={p.name} />
        ))}
      </Form.Dropdown>

      {selectedPreset && (
        <Form.Description
          title="Preset Details"
          text={`Path: ${selectedPreset.path[0].replace(/^~(?=$|\/|\\)/, homedir())}\nCommand: ${selectedPreset.command}`}
        />
      )}
    </Form>
  );
}
