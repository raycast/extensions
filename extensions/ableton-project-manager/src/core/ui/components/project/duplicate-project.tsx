import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { docNameTakenBy } from "@/core/docs/docs";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import type { Project } from "@/core/projects/types";
import { copyErrorAction } from "@/core/ui/toast";

const t = getTranslations(getSettings().language);

// 与 Finder 一致的副本命名：Song copy、Song copy 2、Song copy 3…
function uniqueCopyName(dir: string, title: string): string {
  let name = `${title} copy`;
  for (let n = 2; fs.existsSync(path.join(dir, name)); n++) {
    name = `${title} copy ${n}`;
  }
  return name;
}

/** 复制整个项目文件夹（与 Finder 逻辑一致，含 Bounces、Backup）。新项目不继承任何扩展数据。 */
export function DuplicateProject({ project, onDuplicated }: { project: Project; onDuplicated: () => void }) {
  const { pop } = useNavigation();
  const parent = path.dirname(project.folderPath);
  const [name, setName] = useState(() => uniqueCopyName(parent, project.title));

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }

    const target = path.join(parent, trimmed);
    if (fs.existsSync(target)) {
      await showToast({ style: Toast.Style.Failure, title: t.nameExists });
      return;
    }

    // 新项目与包括原项目在内的任何项目都不能共用笔记文件（如 Song?A 复制成 Song？A）。
    const docTakenBy = docNameTakenBy(trimmed, "");
    if (docTakenBy.length > 0) {
      await showToast({ style: Toast.Style.Failure, title: t.docNameTaken, message: docTakenBy.join(", ") });
      return;
    }

    // 先关掉表单，复制在后台进行（项目可能有好几 GB）。
    pop();
    const toast = await showToast({ style: Toast.Style.Animated, title: t.duplicatingProject, message: trimmed });

    try {
      // 符号链接按链接本身复制（与 Finder 一致）；保留修改时间，副本在"修改时间"排序里与原项目相邻。
      await fs.promises.cp(project.folderPath, target, {
        recursive: true,
        errorOnExist: true,
        force: false,
        preserveTimestamps: true,
      });
      toast.style = Toast.Style.Success;
      toast.title = t.projectDuplicated;
      onDuplicated();
    } catch (error) {
      // 复制失败时清理半成品；但 EEXIST 说明目标在复制前就已被别的进程创建（不是本次产物），绝不能删。
      const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ERR_FS_CP_EEXIST") {
        await fs.promises.rm(target, { recursive: true, force: true }).catch(() => undefined);
      }
      toast.style = Toast.Style.Failure;
      toast.title = code === "ERR_FS_CP_EEXIST" ? t.nameExists : t.duplicateFailed;
      toast.message = error instanceof Error ? error.message : String(error);
      toast.primaryAction = copyErrorAction(toast.title, error);
    }
  }

  return (
    <Form
      navigationTitle={`${t.duplicateProject} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.duplicateProject} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
    </Form>
  );
}
