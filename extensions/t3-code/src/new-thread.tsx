import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { classifyError, dispatch, fetchProjects } from "./api";
import { appShortcut } from "./raycast-ui";
import { readCachedProjectOverview } from "./snapshot-cache";
import {
  Device,
  ModelOption,
  ModelSelection,
  OrchestrationProject,
  RuntimeMode,
  InteractionMode,
} from "./types";

const FALLBACK_MODEL: ModelOption = {
  key: "claude-agent::claude-sonnet-4-6",
  instanceId: "claude-agent",
  model: "claude-sonnet-4-6",
  label: "claude-sonnet-4-6",
  providerLabel: "claude-agent",
};

export default function NewThreadForm({
  device,
  preselectedProjectId,
  modelOptions,
  onDone,
}: {
  device: Device;
  preselectedProjectId?: string;
  modelOptions: ModelOption[];
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const dropdownModelOptions =
    modelOptions.length > 0 ? modelOptions : [FALLBACK_MODEL];
  const defaultModelKey = dropdownModelOptions[0]?.key ?? FALLBACK_MODEL.key;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<OrchestrationProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    preselectedProjectId ?? "",
  );
  const [selectedModelKey, setSelectedModelKey] = useState(defaultModelKey);
  const isClaude = (selectedModelKey.split("::")[0] ?? "")
    .toLowerCase()
    .includes("claude");

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedProjectOverview(device.baseUrl);
    if (cached) {
      setProjects(cached.projects);
      setSelectedProjectId((current) =>
        resolveProjectId(current, preselectedProjectId, cached.projects),
      );
      setIsLoadingProjects(false);
    }

    void fetchProjects(device.baseUrl, device.accessToken)
      .then((overview) => {
        if (cancelled) return;
        setProjects(overview.projects);
        setSelectedProjectId((current) =>
          resolveProjectId(current, preselectedProjectId, overview.projects),
        );
      })
      .catch(async (err) => {
        const classified = classifyError(err);
        await showToast(Toast.Style.Failure, classified.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [device.baseUrl, device.accessToken, preselectedProjectId]);

  useEffect(() => {
    if (
      !dropdownModelOptions.some((option) => option.key === selectedModelKey)
    ) {
      setSelectedModelKey(defaultModelKey);
    }
  }, [defaultModelKey, dropdownModelOptions, selectedModelKey]);

  async function handleSubmit(values: {
    projectId: string;
    message: string;
    modelKey: string;
    effort: string;
    runtimeMode: RuntimeMode;
    interactionMode: InteractionMode;
    contextWindow: string;
    fastMode: string;
    branch: string;
  }) {
    if (!values.message.trim()) {
      await showToast(Toast.Style.Failure, "Task description is required");
      return;
    }
    if (!values.projectId) {
      await showToast(Toast.Style.Failure, "Project is required");
      return;
    }
    if (!values.modelKey) {
      await showToast(Toast.Style.Failure, "Model is required");
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Starting thread...");

    try {
      const [instanceId, model] = values.modelKey.split("::");
      const isClaudeModel = (instanceId ?? "").toLowerCase().includes("claude");
      const options: Array<{ id: string; value: string | boolean }> = [];
      if (isClaudeModel) {
        if (values.effort) options.push({ id: "effort", value: values.effort });
        if (values.contextWindow)
          options.push({ id: "contextWindow", value: values.contextWindow });
        if (values.fastMode)
          options.push({ id: "fastMode", value: values.fastMode === "true" });
      }

      const modelSelection: ModelSelection = {
        instanceId: instanceId ?? "claude-agent",
        model: model ?? "claude-sonnet-4-6",
        options,
      };

      const branch = values.branch.trim() || null;
      const threadId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await dispatch(device.baseUrl, device.accessToken, {
        type: "thread.create",
        commandId: crypto.randomUUID(),
        threadId,
        projectId: values.projectId,
        title: values.message.trim().slice(0, 80),
        modelSelection,
        runtimeMode: values.runtimeMode,
        interactionMode: values.interactionMode,
        branch,
        worktreePath: null,
        createdAt,
      });

      try {
        await dispatch(device.baseUrl, device.accessToken, {
          type: "thread.turn.start",
          commandId: crypto.randomUUID(),
          threadId,
          message: {
            messageId: crypto.randomUUID(),
            role: "user",
            text: values.message.trim(),
            attachments: [],
          },
          modelSelection,
          titleSeed: values.message.trim().slice(0, 80),
          runtimeMode: values.runtimeMode,
          interactionMode: values.interactionMode,
          createdAt,
        });
      } catch (err) {
        await dispatch(device.baseUrl, device.accessToken, {
          type: "thread.delete",
          commandId: crypto.randomUUID(),
          threadId,
        }).catch(() => undefined);
        throw err;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Thread started";
      await onDone();
      pop();
    } catch (err) {
      const classified = classifyError(err);
      toast.style = Toast.Style.Failure;
      toast.title = classified.message;
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="New Thread"
      isLoading={isSubmitting || isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Task"
            icon={Icon.Play}
            shortcut={appShortcut("return")}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      >
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="message"
        title="Task Description"
        placeholder="Describe what you want the agent to do..."
      />

      <Form.Separator />

      <Form.Dropdown
        id="modelKey"
        title="Model"
        value={selectedModelKey}
        onChange={setSelectedModelKey}
      >
        {dropdownModelOptions.map((m) => (
          <Form.Dropdown.Item
            key={m.key}
            value={m.key}
            title={m.label}
            icon={Icon.ComputerChip}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="runtimeMode"
        title="Runtime"
        defaultValue="full-access"
      >
        <Form.Dropdown.Item value="approval-required" title="Approve Actions" />
        <Form.Dropdown.Item
          value="auto-accept-edits"
          title="Auto-Accept Edits"
        />
        <Form.Dropdown.Item value="full-access" title="Full Access" />
      </Form.Dropdown>

      <Form.Dropdown
        id="interactionMode"
        title="Interaction"
        defaultValue="default"
      >
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="plan" title="Plan" />
      </Form.Dropdown>

      {isClaude && (
        <>
          <Form.Dropdown id="effort" title="Effort" defaultValue="high">
            <Form.Dropdown.Item value="low" title="Low" />
            <Form.Dropdown.Item value="medium" title="Medium" />
            <Form.Dropdown.Item value="high" title="High" />
          </Form.Dropdown>
          <Form.Dropdown
            id="contextWindow"
            title="Context Window"
            defaultValue="1M"
          >
            <Form.Dropdown.Item value="200k" title="200k" />
            <Form.Dropdown.Item value="1M" title="1M" />
          </Form.Dropdown>
          <Form.Dropdown id="fastMode" title="Fast Mode" defaultValue="false">
            <Form.Dropdown.Item value="false" title="Off" />
            <Form.Dropdown.Item value="true" title="On" />
          </Form.Dropdown>
        </>
      )}

      <Form.TextField
        id="branch"
        title="Branch"
        placeholder="Leave empty for current branch"
      />
    </Form>
  );
}

function resolveProjectId(
  current: string,
  preferred: string | undefined,
  projects: OrchestrationProject[],
): string {
  if (projects.some((project) => project.id === current)) return current;
  if (preferred && projects.some((project) => project.id === preferred)) {
    return preferred;
  }
  return projects[0]?.id ?? "";
}
