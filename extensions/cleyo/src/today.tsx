/**
 * Plan My Day command
 */

import { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  Detail,
} from "@raycast/api";
import TaskDetail from "./components/TaskDetail";
import { formatMinutes } from "./lib/utils";
import { getTodayPlan, completeTask, updateTask } from "./lib/api";
import { DailyPlan, PlannedTask, EnergyLevel, Task } from "./lib/types";
import { useAuth } from "./hooks/useAuth";
import { AuthenticatedView } from "./components/AuthenticatedView";
import {
  ENERGY_OPTIONS,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
} from "./lib/constants";

function TodayPlan() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("medium");
  const [availableHours] = useState<number>(6);
  const { handleSignOut } = useAuth();

  // Load plan
  useEffect(() => {
    loadPlan();
  }, [energyLevel, availableHours]);

  async function loadPlan() {
    setIsLoading(true);
    try {
      const result = await getTodayPlan({
        energy_level: energyLevel,
        available_hours: availableHours,
      });
      setPlan(result);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate plan",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await completeTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: task.title,
      });
      await loadPlan();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleUpdateTask(task: Task, updates: Partial<Task>) {
    try {
      await updateTask(task.id, updates);
      await showToast({
        style: Toast.Style.Success,
        title: "Task updated",
        message: task.title,
      });
      await loadPlan(); // Refresh plan
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function renderPlannedTask(item: PlannedTask, section: string) {
    return (
      <List.Item
        key={`${section}-${item.task_id}`}
        title={item.task.title}
        subtitle={item.task.category || undefined}
        accessories={
          [
            {
              tag: {
                value: formatMinutes(item.time_allocation_minutes),
                color: Color.Blue,
              },
              tooltip: "Time allocated",
            },
            item.task.priority
              ? {
                  tag: {
                    value: `P${item.task.priority}`,
                    color:
                      PRIORITY_OPTIONS.find(
                        (o) => o.value === item.task.priority?.toString(),
                      )?.color || Color.Red,
                  },
                  tooltip: "Priority",
                }
              : null,
          ].filter(Boolean) as List.Item.Accessory[]
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              icon={Icon.Sidebar}
              target={
                <TaskDetail
                  task={item.task}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Complete Task"
                        icon={Icon.Checkmark}
                        onAction={() => handleCompleteTask(item.task)}
                      />
                      <Action.PickDate
                        title="Set Due Date"
                        onChange={(date) =>
                          handleUpdateTask(item.task, {
                            due_date: date?.toISOString(),
                          })
                        }
                      />

                      <ActionPanel.Submenu
                        title="Change Priority"
                        icon={Icon.Tag}
                      >
                        {PRIORITY_OPTIONS.map(({ value, title }) => (
                          <Action
                            key={value}
                            title={title}
                            onAction={() =>
                              handleUpdateTask(item.task, {
                                priority: parseInt(value),
                              })
                            }
                          />
                        ))}
                      </ActionPanel.Submenu>

                      <ActionPanel.Submenu
                        title="Change Energy"
                        icon={Icon.Bolt}
                      >
                        {ENERGY_OPTIONS.map((e) => (
                          <Action
                            key={e.value}
                            title={e.title}
                            onAction={() =>
                              handleUpdateTask(item.task, {
                                energy_required: e.value,
                              })
                            }
                          />
                        ))}
                      </ActionPanel.Submenu>

                      <ActionPanel.Submenu
                        title="Change Category"
                        icon={Icon.Folder}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <Action
                            key={c.value}
                            title={c.title}
                            onAction={() =>
                              handleUpdateTask(item.task, { category: c.value })
                            }
                          />
                        ))}
                      </ActionPanel.Submenu>

                      <Action.CopyToClipboard
                        title="Copy Task Title"
                        content={item.task.title}
                      />
                    </ActionPanel>
                  }
                />
              }
            />
            <Action
              title="Complete Task"
              icon={Icon.Checkmark}
              onAction={() => handleCompleteTask(item.task)}
            />
            <Action.CopyToClipboard
              title="Copy Task Title"
              content={item.task.title}
            />
            <ActionPanel.Section title="Account">
              <Action
                title="Sign Out"
                icon={Icon.Logout}
                style={Action.Style.Destructive}
                onAction={handleSignOut}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Energy Level"
          value={energyLevel}
          onChange={(value) => setEnergyLevel(value as EnergyLevel)}
        >
          {ENERGY_OPTIONS.map((e) => (
            <List.Dropdown.Item
              key={e.value}
              title={e.title}
              value={e.value}
              icon={e.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {plan && (
        <>
          <List.Section
            title="Summary"
            subtitle={`${formatMinutes(plan.total_time_minutes)} planned, ${formatMinutes(plan.buffer_time_minutes)} buffer`}
          >
            <List.Item
              title="Daily Focus"
              subtitle={plan.overall_reasoning}
              icon={Icon.Calendar}
              accessories={[
                { date: new Date(plan.date), tooltip: "Plan date" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Read Full Summary"
                    icon={Icon.Text}
                    target={
                      <Detail
                        markdown={`# Daily Focus\n\n${plan.overall_reasoning}`}
                        metadata={
                          <Detail.Metadata>
                            <Detail.Metadata.Label
                              title="Date"
                              text={new Date(plan.date).toLocaleDateString()}
                            />
                          </Detail.Metadata>
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {plan.must_do.length > 0 && (
            <List.Section
              title="Must Do"
              subtitle={`${plan.must_do.length} tasks`}
            >
              {plan.must_do.map((item) => renderPlannedTask(item, "must_do"))}
            </List.Section>
          )}

          {plan.procrastinated_focus && (
            <List.Section
              title="Procrastination Focus"
              subtitle="Face it today!"
            >
              {renderPlannedTask(plan.procrastinated_focus, "procrastinated")}
            </List.Section>
          )}

          {plan.quick_wins.length > 0 && (
            <List.Section
              title="Quick Wins"
              subtitle={`${plan.quick_wins.length} tasks`}
            >
              {plan.quick_wins.map((item) =>
                renderPlannedTask(item, "quick_wins"),
              )}
            </List.Section>
          )}
        </>
      )}

      {!plan && !isLoading && (
        <List.EmptyView
          title="No plan available"
          description="Add some tasks first to get a daily plan"
          icon={Icon.Calendar}
        />
      )}
    </List>
  );
}

export default function Today() {
  return (
    <AuthenticatedView>
      <TodayPlan />
    </AuthenticatedView>
  );
}
