import { Action, ActionPanel, Form, Icon, Toast } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { createPlainNode } from "../api";
import { requireTools } from "../api/capabilities";
import { TanaTag, TanaWorkspace } from "../api/contracts";
import { createPreferenceClient, getTanaPreferences } from "../api/preferenceClient";
import { getCalendarNodeId, listTags, listWorkspaces } from "../api/tanaService";
import { useTanaLocal } from "../state";
import { createSubmissionGate } from "../policies";
import { CreateSupertagAction } from "./SupertagCreateForm";
import { CreateTargetNodeAction } from "./TargetNodePicker";

type Values = {
  note: string;
  workspaceId: string;
  targetNodeId: string;
  supertagIds?: string[];
};

type WorkspaceSelections = Record<string, string>;
type WorkspaceTagSelections = Record<string, string[]>;

export function AddToNodeForm({
  enableDrafts = true,
  initialWorkspaceId,
  initialTargetNodeId,
  initialTargetNodeName,
  onCreated,
}: {
  enableDrafts?: boolean;
  initialWorkspaceId?: string;
  initialTargetNodeId?: string;
  initialTargetNodeName?: string;
  onCreated?: () => void;
} = {}) {
  const configuredWorkspaceId = getTanaPreferences().workspaceId?.trim() ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [discovering, setDiscovering] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string>();
  const [workspaces, setWorkspaces] = useState<TanaWorkspace[]>(
    configuredWorkspaceId ? [{ id: configuredWorkspaceId, name: "Configured Workspace" }] : [],
  );
  const [serviceTags, setServiceTags] = useState<TanaTag[]>([]);
  const submissionGate = useMemo(createSubmissionGate, []);
  const { targetNodes, supertags: localSupertags } = useTanaLocal();
  const [cachedWorkspaceId, setCachedWorkspaceId] = useCachedState("selectedWorkspaceId", configuredWorkspaceId);
  const [targetSelections, setTargetSelections] = useCachedState<WorkspaceSelections>("targetNodeIdsByWorkspace", {});
  const [tagSelections, setTagSelections] = useCachedState<WorkspaceTagSelections>("supertagIdsByWorkspace", {});

  const { handleSubmit, itemProps, reset, setValue } = useForm<Values>({
    async onSubmit(values) {
      if (!submissionGate.enter()) return;
      setSubmitting(true);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating Note" });
      await toast.show();

      try {
        const client = createPreferenceClient(values.workspaceId);
        const targetNodeId =
          values.targetNodeId === "TODAY" ? await getCalendarNodeId(client, values.workspaceId) : values.targetNodeId;
        const createdNodeId = await createPlainNode(
          {
            name: values.note,
            supertags: values.supertagIds?.map((id) => ({ id })),
          },
          targetNodeId,
          values.workspaceId,
        );
        toast.style = Toast.Style.Success;
        toast.message = `Created ${createdNodeId}`;
        setCachedWorkspaceId(values.workspaceId);
        setTargetSelections({ ...targetSelections, [values.workspaceId]: values.targetNodeId });
        setTagSelections({ ...tagSelections, [values.workspaceId]: values.supertagIds ?? [] });
        reset({
          note: "",
          workspaceId: values.workspaceId,
          targetNodeId: values.targetNodeId,
          supertagIds: values.supertagIds,
        });
        onCreated?.();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : "Unknown error";
      } finally {
        submissionGate.leave();
        setSubmitting(false);
      }
    },
    validation: {
      note: FormValidation.Required,
      workspaceId: FormValidation.Required,
      targetNodeId: FormValidation.Required,
    },
    initialValues: {
      note: "",
      workspaceId: initialWorkspaceId || cachedWorkspaceId,
      targetNodeId: initialTargetNodeId || targetSelections[initialWorkspaceId || cachedWorkspaceId] || "INBOX",
      supertagIds: tagSelections[initialWorkspaceId || cachedWorkspaceId] ?? [],
    },
  });

  const selectedWorkspaceId = itemProps.workspaceId.value || cachedWorkspaceId;
  const showInitialTarget =
    initialTargetNodeId &&
    initialTargetNodeId !== "INBOX" &&
    initialTargetNodeId !== "TODAY" &&
    !targetNodes.some((node) => node.id === initialTargetNodeId);
  const discoveryErrorText = `${discoveryError}. ${
    enableDrafts ? "Your draft is preserved." : "Keep this form open to avoid losing unsaved text."
  }`;

  useEffect(() => {
    let active = true;
    setDiscovering(true);
    const discover = async () => {
      try {
        const client = createPreferenceClient(selectedWorkspaceId);
        await requireTools(client, [
          "list_workspaces",
          "list_tags",
          "import_tana_paste",
          "get_or_create_calendar_node",
        ]);
        const items = await listWorkspaces(client);
        if (!active) return;
        const fallback = configuredWorkspaceId ? [{ id: configuredWorkspaceId, name: "Configured Workspace" }] : [];
        const available = items.length ? items : fallback;
        setWorkspaces(available);
        const currentExists = available.some(({ id }) => id === selectedWorkspaceId);
        if (!currentExists && available[0]) setValue("workspaceId", available[0].id);
        setDiscoveryError(undefined);
        setDiscovering(false);
      } catch (error) {
        if (!active) return;
        if (configuredWorkspaceId) setWorkspaces([{ id: configuredWorkspaceId, name: "Configured Workspace" }]);
        setDiscoveryError(error instanceof Error ? error.message : "Workspace discovery failed");
        setDiscovering(false);
      }
    };
    void discover();
    return () => {
      active = false;
    };
  }, [configuredWorkspaceId, selectedWorkspaceId, setValue]);

  useEffect(() => {
    let active = true;
    if (!selectedWorkspaceId) return;
    listTags(createPreferenceClient(selectedWorkspaceId), selectedWorkspaceId).then(
      (items) => active && setServiceTags(items),
      () => active && setServiceTags([]),
    );
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const tags = useMemo(() => {
    const byId = new Map<string, TanaTag>();
    serviceTags.forEach((tag) => byId.set(tag.id, tag));
    if (selectedWorkspaceId === configuredWorkspaceId) {
      localSupertags.forEach((tag) => {
        if (!byId.has(tag.id)) byId.set(tag.id, { id: tag.id, name: tag.name, color: tag.color });
      });
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [configuredWorkspaceId, localSupertags, selectedWorkspaceId, serviceTags]);

  return (
    <Form
      enableDrafts={enableDrafts}
      isLoading={submitting || discovering}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} icon={Icon.Plus} />
          <CreateTargetNodeAction
            shortcut={false}
            workspaceId={selectedWorkspaceId}
            onCreate={(node) => {
              setValue("targetNodeId", node.id);
            }}
          />
          <CreateSupertagAction
            shortcut={false}
            workspaceId={selectedWorkspaceId}
            onCreate={(tag) => {
              setServiceTags([...serviceTags, tag]);
              setValue("supertagIds", [...(itemProps.supertagIds.value || []), tag.id]);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Note" placeholder="Enter note" {...itemProps.note} />
      <Form.Dropdown
        title="Workspace"
        {...itemProps.workspaceId}
        onChange={(workspaceId) => {
          itemProps.workspaceId.onChange?.(workspaceId);
          setValue("targetNodeId", targetSelections[workspaceId] ?? "INBOX");
          setValue("supertagIds", tagSelections[workspaceId] ?? []);
        }}
      >
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item key={workspace.id} title={workspace.name || workspace.id} value={workspace.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Target Node" {...itemProps.targetNodeId}>
        {showInitialTarget && (
          <Form.Dropdown.Section title="Current Target">
            <Form.Dropdown.Item
              title={initialTargetNodeName || initialTargetNodeId}
              value={initialTargetNodeId}
              icon={Icon.Dot}
            />
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section title="Capture">
          <Form.Dropdown.Item title="Inbox" value="INBOX" icon={Icon.Tray} />
          <Form.Dropdown.Item title="Today" value="TODAY" icon={Icon.Calendar} />
        </Form.Dropdown.Section>
        {selectedWorkspaceId === configuredWorkspaceId && targetNodes.length > 0 && (
          <Form.Dropdown.Section title="Pinned Targets">
            {targetNodes.map((node) => (
              <Form.Dropdown.Item key={node.id} title={node.name} value={node.id} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TagPicker title="Supertags" {...itemProps.supertagIds}>
        {tags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.id}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
          />
        ))}
      </Form.TagPicker>
      {discoveryError && <Form.Description title="Local API" text={discoveryErrorText} />}
    </Form>
  );
}
