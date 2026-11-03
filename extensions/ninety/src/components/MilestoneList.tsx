import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getRockMilestones, updateMilestone } from "../api/ninety";
import { Milestone, Rock } from "../api/types";
import { showError } from "../lib/errors";
import { dueDateAccessory, parseDueDate } from "../lib/format";
import { NinetyUrls } from "../lib/urls";
import { ErrorView } from "./ErrorView";
import { MilestoneForm } from "./MilestoneForm";
import { TodoForm } from "./TodoForm";
import { UPDATE_SHORTCUT } from "../lib/shortcuts";

interface Props {
  rock: Rock;
  onChange?: () => void;
}

export function MilestoneList({ rock, onChange }: Props) {
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(getRockMilestones, [rock._id], {
    onError: (error) => {
      showError(error, "Couldn't load Milestones");
    },
  });
  const milestones = [...(data ?? [])].sort(
    (a, b) => (parseDueDate(a.dueDate)?.getTime() ?? 0) - (parseDueDate(b.dueDate)?.getTime() ?? 0),
  );
  const done = milestones.filter((m) => m.isDone).length;

  const refresh = () => {
    revalidate();
    onChange?.();
  };

  async function toggle(milestone: Milestone) {
    const isDone = !milestone.isDone;
    try {
      await mutate(
        updateMilestone(milestone._id, { isDone, completedDate: isDone ? new Date().toISOString() : undefined }),
        { optimisticUpdate: (current) => current?.map((m) => (m._id === milestone._id ? { ...m, isDone } : m)) },
      );
      onChange?.();
      await showToast({ style: Toast.Style.Success, title: isDone ? "Milestone done" : "Milestone reopened" });
    } catch (error) {
      await showError(error, "Couldn't update Milestone");
    }
  }

  const addAction = (
    <Action.Push
      title="Add Milestone"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<MilestoneForm rock={rock} onSaved={refresh} />}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={rock.title} searchBarPlaceholder="Filter Milestones">
      {error ? (
        <ErrorView title="Couldn't load Milestones" error={error} onRetry={() => revalidate()} />
      ) : (
        <List.EmptyView
          icon={Icon.Flag}
          title="No Milestones"
          description="Press ⌘N to add one."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      )}
      <List.Section
        title="Milestones"
        subtitle={milestones.length ? `${done} of ${milestones.length} done` : undefined}
      >
        {milestones.map((milestone) => (
          <List.Item
            key={milestone._id}
            title={milestone.title}
            icon={
              milestone.isDone
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[dueDateAccessory(milestone.dueDate, milestone.isDone) ?? {}]}
            actions={
              <ActionPanel>
                <Action
                  title={milestone.isDone ? "Mark as Not Done" : "Mark as Done"}
                  icon={milestone.isDone ? Icon.Circle : Icon.CheckCircle}
                  shortcut={UPDATE_SHORTCUT}
                  onAction={() => toggle(milestone)}
                />
                <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.rock(rock)} />
                <Action.Push
                  title="Edit Milestone"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<MilestoneForm rock={rock} milestone={milestone} onSaved={refresh} />}
                />
                <Action.Push
                  title="Create Linked To-Do"
                  icon={Icon.CheckList}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "t" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "t" },
                  }}
                  target={
                    <TodoForm
                      defaultTeamId={rock.teamId}
                      link={{ id: milestone._id, type: "milestone", title: milestone.title }}
                    />
                  }
                />
                {addAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
