import { ActionPanel, Action, Alert, Form, Icon, confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  docFileMtime,
  initialContent,
  isBlankDoc,
  readDocFileForEdit,
  stripFrontmatter,
  writeDocBody,
} from "@/core/docs/docs";
import { showDocError } from "@/core/docs/doc-actions";
import { getSettings } from "@/settings";
import { showFailure } from "@/core/ui/toast";
import { getTranslations } from "@/i18n";
import type { Project } from "@/core/projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

export function EditNote({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");
  // 原文读进来之前不给保存：读不出来时若以空白表单打开，一保存就把原文覆盖了。
  const [loaded, setLoaded] = useState(false);
  // 打开时文件的修改时间：保存前比对，发现表单开着期间别处（如 Obsidian）改过这份笔记。
  const loadedMtime = useRef<number | null>(null);

  useEffect(() => {
    loadedMtime.current = docFileMtime(project, "notes");
    try {
      const raw = readDocFileForEdit(project, "notes");
      // 新建或空笔记：用模板正文预填；保存时 frontmatter 也取自模板（见 writeDocBody）。
      setNote(stripFrontmatter(isBlankDoc(raw) ? initialContent(project, "notes") : raw));
      setLoaded(true);
    } catch (error) {
      void showFailure(t.docUnreadable, error, { message: t.docUnreadableHint });
      pop();
    }
  }, [project, pop]);

  async function handleSubmit() {
    if (!loaded) return;
    if (docFileMtime(project, "notes") !== loadedMtime.current) {
      const confirmed = await confirmAlert({
        icon: Icon.Warning,
        title: t.docChangedExternally,
        message: t.docChangedExternallyHint,
        primaryAction: { title: t.overwriteDoc, style: Alert.ActionStyle.Destructive },
      });
      // 不覆盖：留在表单里，已输入的内容不丢。
      if (!confirmed) return;
    }

    try {
      writeDocBody(project, "notes", note);
    } catch (error) {
      // 自定义文件夹失效等：不返回上一页，保留已输入的内容。
      await showDocError(error);
      return;
    }

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: t.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      isLoading={!loaded}
      navigationTitle={`${t.editNote} — ${project.title}`}
      actions={<ActionPanel>{loaded && <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />}</ActionPanel>}
    >
      <Form.TextArea id="note" title={t.notes} value={note} onChange={setNote} />
    </Form>
  );
}
