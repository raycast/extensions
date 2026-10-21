import fs from "node:fs";
import { Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import {
  DocFolderMissingError,
  DocSharedError,
  docFilePath,
  docSharedWith,
  ensureDocFile,
  forgetDocFolder,
  missingDocFolder,
  unreadableTemplate,
  type DocKind,
} from "./docs";
import { showFailure } from "@/core/ui/toast";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";

const t = getTranslations(getSettings().language);

/** 文档读写出错时统一提示；自定义文件夹失效时附带"打开扩展设置"。 */
export async function showDocError(error: unknown): Promise<void> {
  if (error instanceof DocSharedError) {
    await showToast({ style: Toast.Style.Failure, title: t.docShared, message: error.others.join(", ") });
    return;
  }
  if (error instanceof DocFolderMissingError) {
    await showToast({
      style: Toast.Style.Failure,
      title: t.docFolderMissing,
      message: error.folder,
      primaryAction: { title: t.openPreferences, onAction: () => void openExtensionPreferences() },
      // 只有设置已被清空时才有意义：设置里还填着旧路径的话，要去设置里改。
      secondaryAction: error.fromMemory
        ? { title: t.useProjectFolders, onAction: () => forgetDocFolder(error.kind) }
        : undefined,
    });
    return;
  }
  await showFailure(t.docSaveFailed, error);
}

/** 打开（必要时按模板新建）某项目的文档；出错时提示而不是抛出。 */
export async function openDoc(project: { title: string; folderPath: string }, kind: DocKind): Promise<void> {
  try {
    // 文件还不存在时会按模板新建：新建后发现模板读不到就如实提示，不悄悄给一个空白文件。
    const isNew = !fs.existsSync(docFilePath(project, kind));
    await open(ensureDocFile(project, kind));
    const template = isNew ? unreadableTemplate(kind) : null;
    if (template) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.templateMissing,
        message: template,
        primaryAction: { title: t.openPreferences, onAction: () => void openExtensionPreferences() },
      });
    }
  } catch (error) {
    await showDocError(error);
  }
}

/** 详情面板没有内容时的占位：文件夹失效则显示警告，否则显示"还没有笔记/歌词"。 */
export function docPlaceholder(kind: DocKind, title?: string): string {
  const others = title ? docSharedWith(title, kind) : [];
  if (others.length > 0) {
    return `**${t.docShared}**\n\n${t.docSharedHint.replace("{names}", others.join(", "))}`;
  }
  const missing = missingDocFolder(kind);
  if (missing) {
    return `**⚠️ ${t.docFolderMissing}**\n\n\`${missing}\`\n\n${t.docFolderMissingHint}`;
  }
  return kind === "notes" ? t.noNotesYet : t.noLyricsYet;
}
