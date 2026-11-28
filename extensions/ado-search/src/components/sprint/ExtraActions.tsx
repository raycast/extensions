import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { WorkItem } from "../../lib/azure-devops";
import { isConfiguredProject, typeTracksHours } from "../../lib/sprint-api";
import { ItemRef } from "../../lib/sprint-types";
import { CopyContent } from "./CopyContent";
import { RelatedView } from "./RelatedView";
import { CommentForm, LogHoursForm, MoveSprintForm } from "./forms";

type Mod = "shift" | "opt";
/** Same key on both platforms: Cmd on macOS, Ctrl on Windows. */
export const sc = (key: Keyboard.KeyEquivalent, extra: Mod[] = []): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", ...extra], key },
  Windows: { modifiers: ["ctrl", ...(extra.map((m) => (m === "opt" ? "alt" : m)) as ("shift" | "alt")[])], key },
});

interface Props {
  item: ItemRef;
  /** Work item type, to know whether hours can be logged on it. */
  type: string;
  /** Pass it when already known; otherwise it is looked up from the type's fields. */
  tracksHours?: boolean;
  onDone: () => void;
}

/**
 * Comment, log hours, move to sprint, related links and content copy actions. Used by Sprint Work Items
 * and My Work Items. Each one is in its own section at the end of the panel, so the existing actions and
 * their shortcuts stay as they were.
 */
export function ExtraActionSections({ item, type, tracksHours, onDone }: Props) {
  const { data: typeHasHours } = useCachedPromise(typeTracksHours, [item.project, type], {
    execute: tracksHours === undefined && !!item.project && !!type,
  });
  const canLogHours = tracksHours ?? typeHasHours ?? false;
  // Sprints are listed for the project in the preferences, so only its items can be moved.
  const canMove = isConfiguredProject(item.project);

  return (
    <>
      <ActionPanel.Section title="Update">
        <Action.Push
          title="Add Comment…"
          icon={Icon.Bubble}
          shortcut={sc("m")}
          target={<CommentForm item={item} onDone={onDone} />}
        />
        {canLogHours && (
          <Action.Push
            title="Log Hours…"
            icon={Icon.Clock}
            shortcut={sc("h")}
            target={<LogHoursForm item={item} onDone={onDone} />}
          />
        )}
        {canMove && (
          <Action.Push
            title="Move to Sprint…"
            icon={Icon.Calendar}
            shortcut={sc("i")}
            target={<MoveSprintForm item={item} onDone={onDone} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Links">
        <Action.Push
          title="Show Related Items, Pull Requests and Commits"
          icon={Icon.Link}
          shortcut={sc("l")}
          target={<RelatedView item={item} onChange={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Content">
        <Action.CopyToClipboard
          title="Copy Id and Title"
          content={`| ${item.id} | ${item.title}`}
          shortcut={sc("t", ["shift"])}
        />
        <Action.Push
          title="Copy Description or Comments…"
          icon={Icon.CopyClipboard}
          shortcut={sc("d", ["opt"])}
          target={<CopyContent item={item} />}
        />
      </ActionPanel.Section>
    </>
  );
}

/** The same actions for a work item of My Work Items. */
export function WorkItemExtraActions({ item, onDone }: { item: WorkItem; onDone: () => void }) {
  return (
    <ExtraActionSections
      item={{ id: item.id, title: item.title, project: item.project, iterationPath: item.iterationPath }}
      type={item.workItemType}
      onDone={onDone}
    />
  );
}
