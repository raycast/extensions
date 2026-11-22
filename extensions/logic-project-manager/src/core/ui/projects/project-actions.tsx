import { Action, ActionPanel, Icon, Keyboard, Toast, open, showToast, useNavigation } from "@raycast/api";
import type { Application } from "@raycast/api";
import path from "node:path";
import type { Project } from "@/core/projects/types";
import { strings } from "@/strings";
import { labels } from "@/daws/labels";
import { daw } from "@/daws";
import { DocActions } from "@/core/ui/actions/doc-actions";
import { OpenProjectInFinderAction } from "@/core/ui/actions/open-project-in-finder";
import { EditInfo } from "@/core/ui/components/edit-info";
import { DuplicateProject, uniqueCopyName } from "@/core/ui/projects/duplicate-project";
import { ManageExternalBounces } from "@/core/ui/components/manage-external-bounces";
import { UnmatchedBounces } from "@/core/ui/bounces";
import { CleanUpRemovedProjects } from "@/core/ui/cleanup";
import { showFailure } from "@/core/ui/shared/toast";
import { resolveSharedBouncesFolder } from "@/core/projects/bounces";

// 项目行的四个操作分区。每个分区只拿自己用到的 props，不传整个视图状态。

/** Details 分区：Edit Info、Edit Note / Edit Lyrics、Open Note / Open Lyrics。 */
export function ProjectDetailsSection({ project, onSaved }: { project: Project; onSaved: () => void }) {
  return (
    <ActionPanel.Section title={strings.sectionDetails}>
      <Action.Push
        title={strings.editInfo}
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<EditInfo project={project} onSaved={onSaved} />}
      />
      <DocActions project={project} onNoteSaved={onSaved} onLyricsSaved={onSaved} />
    </ActionPanel.Section>
  );
}

/** Pin 分区：Pin / Unpin，已 Pin 时多出 Move Up / Move Down。 */
export function ProjectPinSection({
  project,
  onPinToggle,
  onMovePinned,
}: {
  project: Project;
  onPinToggle: () => void;
  onMovePinned: (direction: "up" | "down") => void;
}) {
  return (
    <ActionPanel.Section title={strings.sectionPin}>
      <Action
        title={project.pinned ? strings.unpinProject : strings.pinProject}
        icon={project.pinned ? Icon.TackDisabled : Icon.Tack}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={onPinToggle}
      />
      {project.pinned && (
        <>
          <Action
            title={strings.moveUp}
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => onMovePinned("up")}
          />
          <Action
            title={strings.moveDown}
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => onMovePinned("down")}
          />
        </>
      )}
    </ActionPanel.Section>
  );
}

/** File 分区：Finder、新建工程文件、复制项目、外部 bounce 来源、未匹配 bounce。 */
export function ProjectFileSection({
  project,
  dawApp,
  projects,
  onChanged,
}: {
  project: Project;
  dawApp: Application | null;
  /** 未匹配 bounce 列表要拿全部项目做匹配。 */
  projects: Project[];
  onChanged: () => void;
}) {
  const { push } = useNavigation();
  return (
    <ActionPanel.Section title={strings.sectionFile}>
      <OpenProjectInFinderAction kind={project.kind} folderPath={project.folderPath} />
      <Action
        title={labels.newProjectFile}
        icon={Icon.NewDocument}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={async () => {
          if (!dawApp) {
            await showToast({ style: Toast.Style.Failure, title: labels.newProjectFileFailed });
            return;
          }
          try {
            await open(dawApp.path);
          } catch (error) {
            await showFailure(labels.newProjectFileFailed, error);
          }
        }}
      />
      {daw.extraNewAction && (
        <Action.Push
          title={daw.extraNewAction.title}
          icon={daw.extraNewAction.icon}
          shortcut={daw.extraNewAction.shortcut}
          target={<daw.extraNewAction.component />}
        />
      )}
      <Action
        title={strings.duplicateProject}
        icon={Icon.Duplicate}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
        onAction={() => {
          // 副本名要读磁盘，在这里算好再打开表单，表单里不读。
          const initialName = uniqueCopyName(path.dirname(project.folderPath), project.title, project.kind);
          push(<DuplicateProject project={project} initialName={initialName} onDuplicated={onChanged} />);
        }}
      />
      <Action.Push
        title={strings.manageExternalBounce}
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        target={
          <ManageExternalBounces
            projectId={project.id}
            projectTitle={project.title}
            externalFolders={project.externalBounceFolders}
            externalFiles={project.externalBounceFiles}
            onSaved={onChanged}
          />
        }
      />
      {resolveSharedBouncesFolder() !== null && (
        <Action.Push
          title={strings.unmatchedBounces}
          icon={Icon.QuestionMarkCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          target={<UnmatchedBounces projects={projects} onChanged={onChanged} />}
        />
      )}
    </ActionPanel.Section>
  );
}

/** Danger Zone 分区：有残留数据时多出 Clean Up Leftovers，以及 Move to Trash。 */
export function ProjectDangerSection({
  hasOrphans,
  onChanged,
  onTrash,
}: {
  hasOrphans: boolean;
  onChanged: () => void;
  onTrash: () => void;
}) {
  return (
    <ActionPanel.Section title={strings.sectionDangerZone}>
      {hasOrphans && (
        <Action.Push
          title={strings.cleanUpLeftovers}
          icon={Icon.Eraser}
          target={<CleanUpRemovedProjects />}
          onPop={onChanged}
        />
      )}
      <Action
        title={strings.moveToTrash}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={onTrash}
      />
    </ActionPanel.Section>
  );
}
