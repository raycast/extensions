import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Icon,
  openExtensionPreferences,
  Color,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { breakdownTask, isAIEnabled, Subtask } from "./aiHelper";
import { createTask } from "./notionClient";

function BreakdownForm({ onBreakdown }: { onBreakdown: (name: string, description: string) => void }) {
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  async function handleSubmit() {
    if (!taskName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a task name",
      });
      return;
    }

    if (!isAIEnabled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI not available",
        message: "Please enable Raycast Pro or add OpenAI API key in settings",
        primaryAction: {
          title: "Open Settings",
          onAction: async () => {
            await openExtensionPreferences();
          },
        },
      });
      return;
    }

    onBreakdown(taskName, taskDescription);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Break Down Task" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="🤖 AI Task Breakdown"
        text="Enter a complex task and AI will break it into actionable subtasks"
      />

      <Form.TextField
        id="name"
        title="Task Name"
        placeholder="Example: Build landing page for product launch"
        value={taskName}
        onChange={setTaskName}
        autoFocus
      />

      <Form.TextArea
        id="description"
        title="Additional Context"
        placeholder="Any additional details about the task..."
        value={taskDescription}
        onChange={setTaskDescription}
      />
    </Form>
  );
}

function SubtasksList({ subtasks, parentTask }: { subtasks: Subtask[]; parentTask: string }) {
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateSelected() {
    if (selectedSubtasks.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select at least one subtask",
      });
      return;
    }

    setIsCreating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${selectedSubtasks.size} subtasks...`,
    });

    try {
      let successCount = 0;
      for (const index of Array.from(selectedSubtasks)) {
        const subtask = subtasks[index];
        await createTask({
          name: subtask.name,
          description: subtask.description,
          status: "To-do",
          estimatedTime: subtask.estimatedTime,
        });
        successCount++;
      }

      toast.style = Toast.Style.Success;
      toast.title = `✓ Created ${successCount} subtasks in Notion`;
      await popToRoot();
    } catch (error) {
      console.error("Error creating subtasks:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create subtasks";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsCreating(false);
    }
  }

  function toggleSubtask(index: number) {
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSubtasks(newSelected);
  }

  function selectAll() {
    setSelectedSubtasks(new Set(subtasks.map((_, i) => i)));
  }

  function deselectAll() {
    setSelectedSubtasks(new Set());
  }

  return (
    <List
      isLoading={isCreating}
      navigationTitle={`Subtasks for: ${parentTask}`}
      searchBarPlaceholder="Filter subtasks..."
    >
      <List.Section title="AI Generated Subtasks" subtitle={`${selectedSubtasks.size}/${subtasks.length} selected`}>
        {subtasks.map((subtask, index) => {
          const isSelected = selectedSubtasks.has(index);
          return (
            <List.Item
              key={index}
              title={subtask.name}
              subtitle={subtask.description}
              icon={{
                source: isSelected ? Icon.CheckCircle : Icon.Circle,
                tintColor: isSelected ? Color.Green : Color.SecondaryText,
              }}
              accessories={
                subtask.estimatedTime
                  ? [
                      {
                        text: `⏱ ${subtask.estimatedTime}`,
                        tooltip: `Estimated: ${subtask.estimatedTime}`,
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => toggleSubtask(index)}
                  />
                  <Action
                    title="Create Selected Tasks"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={handleCreateSelected}
                  />
                  <ActionPanel.Section>
                    <Action title="Select All" icon={Icon.CheckCircle} onAction={selectAll} />
                    <Action title="Deselect All" icon={Icon.XMarkCircle} onAction={deselectAll} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function TaskBreakdown() {
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null);
  const [parentTask, setParentTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleBreakdown(name: string, description: string) {
    setIsLoading(true);
    setParentTask(name);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🤖 AI is breaking down your task...",
    });

    try {
      const result = await breakdownTask(name, description);
      setSubtasks(result);

      toast.style = Toast.Style.Success;
      toast.title = `✨ Generated ${result.length} subtasks`;
    } catch (error) {
      console.error("Error breaking down task:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to break down task";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          title="AI is analyzing..."
          description="Breaking down your task into actionable subtasks"
          icon={Icon.Wand}
        />
      </List>
    );
  }

  if (subtasks) {
    return <SubtasksList subtasks={subtasks} parentTask={parentTask} />;
  }

  return <BreakdownForm onBreakdown={handleBreakdown} />;
}
