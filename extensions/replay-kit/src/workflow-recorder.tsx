import {
  Detail,
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { TaskRecorder } from "./utils/recorder";
import { saveRecording } from "./utils/storage";
import { TaskAction, RecordingSession, TaskRecording } from "./types";

type RecorderState = "idle" | "recording" | "review";

interface RecorderFormData {
  taskName: string;
  description: string;
  tags: string;
  sensitiveData: string;
}

export default function TaskRecorderCommand() {
  const [state, setState] = useState<RecorderState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [actions, setActions] = useState<TaskAction[]>([]);
  const [formData, setFormData] = useState<RecorderFormData>({
    taskName: "",
    description: "",
    tags: "",
    sensitiveData: "",
  });

  useEffect(() => {
    checkExistingSession();
    const interval = setInterval(() => {
      if (state === "recording") {
        updateActionCount();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [state]);

  async function checkExistingSession() {
    try {
      const recorder = TaskRecorder.getInstance();
      const existingSession = await recorder.getSessionStatus();
      if (existingSession?.isActive) {
        setState("recording");
        setActionCount(existingSession.actions.length);
        setSession(existingSession);
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }

  async function updateActionCount() {
    try {
      const recorder = TaskRecorder.getInstance();
      const currentSession = await recorder.getSessionStatus();
      if (currentSession) {
        setActionCount(currentSession.actions.length);
        setSession(currentSession);
      }
    } catch (error) {
      console.error("Error updating action count:", error);
    }
  }

  async function handleStartRecording() {
    setIsLoading(true);
    try {
      const recorder = TaskRecorder.getInstance();
      const sessionId = await recorder.startRecording();
      await showToast({
        style: Toast.Style.Success,
        title: "Recording Started",
        message: `Session: ${sessionId}`,
      });
      setState("recording");
      setActionCount(0);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start recording",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStopRecording() {
    setIsLoading(true);
    try {
      const recorder = TaskRecorder.getInstance();
      const stoppedSession = await recorder.stopRecording();
      if (!stoppedSession) {
        throw new Error("No session data available");
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Recording Stopped",
        message: `Captured ${stoppedSession.actions.length} actions`,
      });
      setSession(stoppedSession);
      setActions(stoppedSession.actions);
      setState("review");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop recording",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDiscardRecording() {
    setState("idle");
    setSession(null);
    setActions([]);
    setActionCount(0);
    showToast({
      style: Toast.Style.Success,
      title: "Recording Discarded",
    });
  }

  async function handleSaveRecording() {
    if (!formData.taskName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task name is required",
      });
      return;
    }
    if (!session) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No recording session",
        message: "Please start and stop a recording first.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { userName = "", startTime } = session;
      const recording: TaskRecording = {
        id: `recording_${Date.now()}`,
        name: formData.taskName.trim(),
        description: formData.description.trim() || "",
        userName,
        createdAt: startTime,
        updatedAt: Date.now(),
        actions,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        sensitiveData: formData.sensitiveData.trim() || undefined,
      };
      await saveRecording(recording);
      await showToast({
        style: Toast.Style.Success,
        title: "Recording Saved",
        message: `Captured ${actions.length} actions`,
      });
      setState("idle");
      setSession(null);
      setActions([]);
      setFormData({
        taskName: "",
        description: "",
        tags: "",
        sensitiveData: "",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save recording",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDeleteAction(actionId: string) {
    setActions(actions.filter((action) => action.id !== actionId));
    showToast({
      style: Toast.Style.Success,
      title: "Action removed",
    });
  }

  switch (state) {
    case "idle":
      return (
        <IdleScreen onStart={handleStartRecording} isLoading={isLoading} />
      );
    case "recording":
      return (
        <RecordingScreen
          actionCount={actionCount}
          onStop={handleStopRecording}
          isLoading={isLoading}
        />
      );
    case "review":
      return (
        <ReviewScreen
          actions={actions}
          onSave={handleSaveRecording}
          onDiscard={handleDiscardRecording}
          onDeleteAction={handleDeleteAction}
          formData={formData}
          setFormData={setFormData}
          isLoading={isLoading}
        />
      );
    default:
      return (
        <IdleScreen onStart={handleStartRecording} isLoading={isLoading} />
      );
  }
}

function IdleScreen({
  onStart,
  isLoading,
}: {
  onStart: () => void;
  isLoading: boolean;
}) {
  return (
    <Detail
      isLoading={isLoading}
      markdown="# 🎬 Task Recorder

**Ready to record your workflow!**

Start monitoring your activities across:
- **Browser**: URL navigation and page visits
- **Terminal**: Commands and directory changes
- **Applications**: App launches and switches
- **Files**: File operations

**Keyboard Shortcuts:**
- **⇥ + ⏎ (Tab + Enter)**: Start Recording
- **⇧ + ⏎ (Shift + Enter)**: Stop Recording (when recording)
- **⌘ + ⏎ (Cmd + Enter)**: Save Recording (when reviewing)"
      actions={
        <ActionPanel>
          <Action
            title="Start Recording"
            onAction={onStart}
            icon={Icon.Circle}
            shortcut={{ modifiers: [], key: "tab" }}
          />
        </ActionPanel>
      }
    />
  );
}

function RecordingScreen({
  actionCount,
  onStop,
  isLoading,
}: {
  actionCount: number;
  onStop: () => void;
  isLoading: boolean;
}) {
  return (
    <Detail
      isLoading={isLoading}
      markdown={`# 🔴 Recording in Progress

**${actionCount} actions** captured so far.

Your workflow is being monitored across:
- Browser navigation
- Terminal commands  
- Application usage
- File operations

**Press Shift + Enter to stop recording** when you're finished to review and save your workflow.`}
      actions={
        <ActionPanel>
          <Action
            title="Stop Recording"
            onAction={onStop}
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["shift"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

function ReviewScreen({
  actions,
  onSave,
  onDiscard,
  onDeleteAction,
  formData,
  setFormData,
  isLoading,
}: {
  actions: TaskAction[];
  onSave: () => void;
  onDiscard: () => void;
  onDeleteAction: (id: string) => void;
  formData: RecorderFormData;
  setFormData: (data: RecorderFormData) => void;
  isLoading: boolean;
}) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set()
  );

  const formatTimestamp = (timestamp: number): string =>
    new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  function toggleActionSelection(actionId: string) {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  }

  function deleteSelectedActions() {
    selectedActions.forEach(onDeleteAction);
    setSelectedActions(new Set());
    showToast({
      style: Toast.Style.Success,
      title: `Deleted ${selectedActions.size} action(s)`,
    });
  }

  function getActionIcon(actionType: string): string {
    switch (actionType) {
      case "browser":
        return "🌐";
      case "terminal":
        return "💻";
      case "application":
        return "📱";
      case "file":
        return "📁";
      default:
        return "📋";
    }
  }

  function getActionDescription(action: TaskAction): string {
    const data = action.data as any;
    switch (action.type) {
      case "browser": {
        const tabContextText =
          data.tabContext === "same_tab"
            ? "(same tab)"
            : data.tabContext === "new_tab"
            ? "(new tab)"
            : data.tabContext === "new_window"
            ? "(new window)"
            : "";
        const browserText = data.browser ? ` in ${data.browser}` : "";
        return `${data.action}: ${data.url}${browserText} ${tabContextText}`.trim();
      }
      case "terminal":
        return `Command: ${data.command}`;
      case "application":
        return `${data.action}: ${data.app}`;
      case "file":
        return `${data.action}: ${data.path}`;
      default:
        return "Unknown action";
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Review & Save Recording"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Recording"
            onSubmit={onSave}
            icon={Icon.Check}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {selectedActions.size > 0 && (
            <Action
              title={`Delete ${selectedActions.size} Selected`}
              onAction={deleteSelectedActions}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          <Action
            title="Discard Recording"
            onAction={onDiscard}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Review and configure your recording with ${actions.length} captured actions.`}
      />

      <Form.TextField
        id="taskName"
        title="📝 Task Name"
        placeholder="Enter a name"
        value={formData.taskName}
        onChange={(v) => setFormData({ ...formData, taskName: v })}
        error={!formData.taskName && "Required"}
      />
      <Form.TextArea
        id="description"
        title="📄 Description"
        placeholder="Optional description"
        value={formData.description}
        onChange={(v) => setFormData({ ...formData, description: v })}
      />
      <Form.TextField
        id="tags"
        title="🏷️ Tags"
        placeholder="Comma-separated tags"
        value={formData.tags}
        onChange={(v) => setFormData({ ...formData, tags: v })}
      />
      <Form.TextArea
        id="sensitiveData"
        title="🔐 Sensitive Data"
        placeholder="key=value per line"
        info="Store passwords or tokens"
        value={formData.sensitiveData}
        onChange={(v) => setFormData({ ...formData, sensitiveData: v })}
      />

      <Form.Separator />
      <Form.Description
        text={`**${actions.length} Actions**${
          selectedActions.size > 0 ? ` (${selectedActions.size} selected)` : ""
        }`}
      />

      {actions.length === 0 ? (
        <Form.Description text="❌ No actions captured." />
      ) : (
        actions.map((action, index) => {
          const selected = selectedActions.has(action.id);
          return (
            <Form.Checkbox
              key={action.id}
              id={action.id}
              label={`${index + 1}. ${getActionIcon(
                action.type
              )} ${getActionDescription(action)} • ${formatTimestamp(
                action.timestamp
              )}`}
              value={selected}
              onChange={() => toggleActionSelection(action.id)}
            />
          );
        })
      )}
    </Form>
  );
}
