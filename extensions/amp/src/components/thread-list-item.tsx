import { Color, Icon, List } from "@raycast/api";
import type { LiveThread, Thread } from "../lib/amp";
import { relativeTime } from "../lib/ui";
import { ThreadActions } from "./thread-actions";

const projectOf = (tree?: string) => (tree ? tree.replace(/\/+$/, "").split("/").pop() : undefined);

export function ThreadListItem({
  thread,
  live,
  onChange,
}: {
  thread: Thread;
  live?: LiveThread;
  onChange?: () => void;
}) {
  const title = thread.title ?? live?.title ?? "Untitled thread";
  const project = live?.project || projectOf(thread.tree);
  const accessories: List.Item.Accessory[] = [];
  if (live?.working) accessories.push({ tag: { value: "working", color: Color.Green } });
  if (project) accessories.push({ tag: project, icon: Icon.Folder });
  if (thread.messageCount) accessories.push({ text: String(thread.messageCount), icon: Icon.Bubble });
  accessories.push({ text: relativeTime(thread.updated), tooltip: new Date(thread.updated).toLocaleString() });
  return (
    <List.Item
      title={title}
      keywords={[thread.id, ...(project ? [project] : [])]}
      icon={
        live?.working
          ? { source: Icon.CircleProgress50, tintColor: Color.Green }
          : { source: Icon.Bubble, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={<ThreadActions id={thread.id} title={title} onChange={onChange} />}
    />
  );
}
