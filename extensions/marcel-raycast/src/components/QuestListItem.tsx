import React from "react";
import { List, ActionPanel, Action, Icon, openExtensionPreferences, confirmAlert, Alert } from "@raycast/api";
import { Quest } from "../types";
import { getDifficultyIcon, getDifficultyColor, getStatusIcon, getStatusColor, getQuestSubtitle } from "../utils";
import { CreateQuestForm } from "./CreateQuestForm";

interface QuestListItemProps {
  quest: Quest;
  onComplete: (quest: Quest) => Promise<void>;
  onUncomplete: (quest: Quest) => Promise<void>;
  onUpdateStatus: (quest: Quest, status: Quest["status"]) => Promise<void>;
  onDelete: (quest: Quest) => Promise<void>;
  onRefresh: () => void;
}

export function QuestListItem({
  quest,
  onComplete,
  onUncomplete,
  onUpdateStatus,
  onDelete,
  onRefresh,
}: QuestListItemProps) {
  const difficultyIcon = getDifficultyIcon(quest.difficulty);
  const difficultyColor = getDifficultyColor(quest.difficulty);
  const statusIcon = quest.done ? Icon.CheckCircle : getStatusIcon(quest.status);
  const statusColor = quest.done ? getStatusColor("done") : getStatusColor(quest.status);

  const accessories: List.Item.Accessory[] = [
    {
      icon: { source: difficultyIcon, tintColor: difficultyColor },
      tooltip: `Difficulty: ${quest.difficulty}`,
    },
    {
      text: `${quest.xpReward} XP`,
      tooltip: `XP Reward: ${quest.xpReward}`,
    },
  ];

  if (quest.goldReward) {
    accessories.push({
      text: `${quest.goldReward} Gold`,
      tooltip: `Gold Reward: ${quest.goldReward}`,
    });
  }

  return (
    <List.Item
      icon={{ source: statusIcon, tintColor: statusColor }}
      title={quest.title}
      subtitle={getQuestSubtitle(quest)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {quest.done ? (
              <Action
                title="Reopen Quest"
                icon={Icon.ArrowCounterClockwise}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => onUncomplete(quest)}
              />
            ) : (
              <Action
                title="Complete Quest"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => onComplete(quest)}
              />
            )}
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            <Action.Push
              title="Create New Quest"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateQuestForm onSuccess={onRefresh} />}
            />
          </ActionPanel.Section>

          {!quest.done && (
            <ActionPanel.Section title="Change Status">
              {quest.status !== "todo" && (
                <Action title="Mark as to Do" icon={Icon.Circle} onAction={() => onUpdateStatus(quest, "todo")} />
              )}
              {quest.status !== "doing" && (
                <Action
                  title="Mark as in Progress"
                  icon={Icon.CircleProgress50}
                  onAction={() => onUpdateStatus(quest, "doing")}
                />
              )}
              {quest.status !== "done" && (
                <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => onUpdateStatus(quest, "done")} />
              )}
            </ActionPanel.Section>
          )}

          {quest.note && (
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Note" content={quest.note} />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action
              title="Delete Quest"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Quest",
                    message: `Are you sure you want to delete "${quest.title}"? This action cannot be undone.`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  await onDelete(quest);
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
