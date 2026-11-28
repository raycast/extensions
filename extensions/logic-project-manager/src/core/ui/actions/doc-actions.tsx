import { Action, Icon } from "@raycast/api";
import { openDoc } from "@/core/ui/shared/doc-open";
import type { Project } from "@/core/projects/types";
import { EditNote } from "@/core/ui/components/edit-note";
import { strings } from "@/strings";

// 笔记和歌词的四个操作：编辑、用默认编辑器打开。各界面共用。
export function DocActions({
  project,
  onNoteSaved,
  onLyricsSaved,
}: {
  project: Project;
  onNoteSaved: () => void;
  onLyricsSaved: () => void;
}) {
  return (
    <>
      <Action.Push
        title={strings.editNotes}
        icon={Icon.Highlight}
        shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
        target={<EditNote project={project} onSaved={onNoteSaved} />}
      />
      <Action.Push
        title={strings.editLyrics}
        icon={Icon.Highlight}
        shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
        target={<EditNote project={project} kind="lyrics" onSaved={onLyricsSaved} />}
      />
      <Action
        title={strings.openNotes}
        icon={Icon.Book}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={async () => {
          await openDoc(project, "notes");
        }}
      />
      <Action
        title={strings.openLyrics}
        icon={Icon.Book}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={async () => {
          await openDoc(project, "lyrics");
        }}
      />
    </>
  );
}
