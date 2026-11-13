import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { LiveThread, Thread } from "../lib/amp";
import { OpenThreadAction, relativeTime } from "../lib/ui";
import { ThreadSecondaryActions } from "./thread-actions";
import { ThreadView } from "./thread-view";

const projectOf = (tree?: string) => (tree ? tree.replace(/\/+$/, "").split("/").pop() : undefined);

/** A thread row from `amp threads list/search` or, for live sections, from `amp top`. */
export const liveAsThread = (t: LiveThread): Thread => ({ id: t.id, title: t.title, updated: t.updatedAt });

export function ThreadListItem({
  thread,
  live,
  ready,
  showProject = true,
  onChange,
  children,
}: {
  thread: Thread;
  live?: LiveThread;
  ready?: boolean;
  showProject?: boolean;
  onChange?: () => void;
  /** Extra action sections, shown after the open actions. */
  children?: ReactNode;
}) {
  const title = thread.title ?? live?.title ?? "Untitled thread";
  const project = live?.project || projectOf(thread.tree);
  const accessories: List.Item.Accessory[] = [];
  if (live?.working) accessories.push({ tag: { value: "working", color: Color.Green } });
  else if (ready) accessories.push({ tag: { value: "ready", color: Color.Orange } });
  if (project && showProject) accessories.push({ tag: project, icon: Icon.Folder });
  if (thread.messageCount) accessories.push({ text: String(thread.messageCount), icon: Icon.Bubble });
  accessories.push({ text: relativeTime(thread.updated), tooltip: new Date(thread.updated).toLocaleString() });
  return (
    <List.Item
      title={title}
      keywords={[thread.id, ...(project ? [project] : [])]}
      icon={
        live?.working
          ? { source: Icon.CircleProgress50, tintColor: Color.Green }
          : ready
            ? { source: Icon.CheckCircle, tintColor: Color.Orange }
            : { source: Icon.Bubble, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Thread"
              icon={Icon.Message}
              target={<ThreadView id={thread.id} title={title} onChange={onChange} />}
              onPop={onChange}
            />
            <OpenThreadAction id={thread.id} />
          </ActionPanel.Section>
          {children}
          <ThreadSecondaryActions id={thread.id} title={title} onChange={onChange} />
        </ActionPanel>
      }
    />
  );
}
