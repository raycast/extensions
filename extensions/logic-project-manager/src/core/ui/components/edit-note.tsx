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
import { showDocError } from "@/core/ui/shared/doc-open";
import { showFailure } from "@/core/ui/shared/toast";
import { strings } from "@/strings";
import type { Project } from "@/core/projects/types";

export function EditNote({
  project,
  kind = "notes",
  onSaved,
}: {
  project: Project;
  kind?: "notes" | "lyrics";
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");
  // 原文读进来之前不给保存：读不出来时若以空白表单打开，一保存就把原文覆盖了。
  const [loaded, setLoaded] = useState(false);
  // 打开时文件的修改时间：保存前比对，发现表单开着期间别处（如 Obsidian）改过这份笔记。
  const loadedMtime = useRef<number | null>(null);

  useEffect(() => {
    loadedMtime.current = docFileMtime(project, kind);
    try {
      const raw = readDocFileForEdit(project, kind);
      // 新建或空笔记：用模板正文预填；保存时 frontmatter 也取自模板（见 writeDocBody）。
      setNote(stripFrontmatter(isBlankDoc(raw) ? initialContent(project, kind) : raw));
      setLoaded(true);
    } catch (error) {
      void showFailure(kind === "notes" ? strings.docUnreadable : strings.lyricsUnreadable, error, {
        message: strings.docUnreadableHint,
      });
      pop();
    }
  }, [project, kind, pop]);

  async function handleSubmit() {
    if (!loaded) return;
    if (docFileMtime(project, kind) !== loadedMtime.current) {
      const confirmed = await confirmAlert({
        icon: Icon.Warning,
        title: kind === "notes" ? strings.docChangedExternally : strings.lyricsChangedExternally,
        message: kind === "notes" ? strings.docChangedExternallyHint : strings.lyricsChangedExternallyHint,
        primaryAction: { title: strings.overwriteDoc, style: Alert.ActionStyle.Destructive },
      });
      // 不覆盖：留在表单里，已输入的内容不丢。
      if (!confirmed) return;
    }

    try {
      writeDocBody(project, kind, note);
    } catch (error) {
      // 自定义文件夹失效等：不返回上一页，保留已输入的内容。
      await showDocError(error);
      return;
    }

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: strings.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      isLoading={!loaded}
      navigationTitle={`${kind === "notes" ? strings.editNote : strings.editLyrics} — ${project.title}`}
      actions={
        <ActionPanel>{loaded && <Action.SubmitForm title={strings.save} onSubmit={handleSubmit} />}</ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title={kind === "notes" ? strings.notes : strings.lyrics}
        placeholder={kind === "notes" ? strings.notesPlaceholder : strings.lyricsPlaceholder}
        value={note}
        onChange={setNote}
      />
    </Form>
  );
}
