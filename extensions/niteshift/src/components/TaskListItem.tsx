import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ApiClient } from "../api/client";
import type { Repository, Task } from "../api/types";
import { getPickupCommand } from "../lib/cli-auth";
import type { Environment } from "../lib/env";
import { formatRelativeTime } from "../lib/format";
import { getStatusPresentation } from "../lib/status";
import { SendPromptForm } from "./SendPromptForm";
import { WatchTaskDetail } from "./WatchTaskDetail";

interface Props {
  task: Task;
  repository?: Repository;
  client: ApiClient;
  env: Environment;
  onMutate?: () => void;
}

/**
 * A task with sessionSync data and a status that the niteshift CLI can
 * actually pick up. Mirrors the predicate the standalone Pick up Task
 * command used to apply before it was folded into List Tasks's ⌘K menu.
 */
function isPickupable(task: Task): boolean {
  if (!task.sessionSync) return false;
  return task.status === "suspended" || task.status === "running";
}

export function TaskListItem({ task, repository, client, env, onMutate }: Props) {
  const status = getStatusPresentation(task.status);
  const repoFullName = repository?.fullName ?? "";
  const taskUrl = repoFullName ? client.taskUrl(repoFullName, task.id) : "";
  const pickupable = isPickupable(task);

  // Single right-anchored accessory keeps the date column clean down the
  // list. Status is conveyed by the icon's color (with a hover tooltip);
  // repo and model are intentionally hidden from the row to keep the title
  // line uncluttered. Both are still searchable via `keywords` below, and
  // the repo dropdown can scope the whole list at once.
  //
  // We render the timestamp via our own short relative formatter ("2h",
  // "3d", "5w") in a text accessory rather than Raycast's `{ date: ... }`
  // accessory: the built-in date accessory falls back to longer absolute
  // strings like "Apr 9, 2024" once a date is older than a day, which
  // Raycast can truncate when title + accessory don't both fit. Our format
  // is at most ~5 characters and never gets cut off. The full absolute
  // date is still discoverable via the accessory tooltip.
  const stamp = task.lastActivity ?? task.createdAt;
  const accessories: List.Item.Accessory[] = [];
  if (stamp) {
    const stampDate = new Date(stamp);
    accessories.push({
      text: formatRelativeTime(stampDate),
      tooltip: stampDate.toLocaleString(),
    });
  }

  // Search keywords match against repo, model, status label, and task id —
  // none of which are visible on the row, but all of which a user might
  // type into the search bar to find a task. "pickup" is added when the
  // task is ready to pick up locally so users can filter to those by
  // typing "pickup" instead of needing a separate command.
  const keywords: string[] = [status.label, task.id];
  if (task.model) keywords.push(task.model);
  if (repository) {
    keywords.push(repository.fullName, repository.owner, repository.name);
  }
  if (pickupable) keywords.push("pickup");

  const pickupCmd = pickupable ? getPickupCommand(env, task.id) : "";
  const pickupResumeCmd = pickupable ? getPickupCommand(env, task.id, { resume: true }) : "";

  return (
    <List.Item
      icon={{
        value: { source: status.icon, tintColor: status.color },
        tooltip: status.label,
      }}
      title={task.name || "(unnamed task)"}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {taskUrl && <Action.OpenInBrowser url={taskUrl} />}
            <Action.Push
              title="Watch Stream"
              icon={Icon.Eye}
              target={<WatchTaskDetail client={client} task={task} repo={repository} />}
            />
            <Action.Push
              title="Send Follow-up Prompt"
              icon={Icon.SpeechBubble}
              // ⌘P and ⌘⇧P are both reserved by Raycast for Pin. ⌘⇧F (F for
              // "follow-up") is free.
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              target={<SendPromptForm client={client} task={task} repo={repository} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {taskUrl && (
              <Action.CopyToClipboard
                title="Copy Task URL"
                content={taskUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Task Id"
              content={task.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {pickupable && (
              <Action.CopyToClipboard
                title="Copy Pickup Command"
                content={pickupCmd}
                icon={Icon.Download}
              />
            )}
            {pickupable && (
              <Action.CopyToClipboard
                title="Copy Pickup --resume Command"
                content={pickupResumeCmd}
                icon={Icon.Download}
              />
            )}
          </ActionPanel.Section>
          {onMutate && (
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={onMutate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
