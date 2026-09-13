import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { accessTokenOptions } from "./oauth";
import {
  hugeicon,
  profileAvatar,
  recordAvatar,
  taskPriorityIcon,
  taskStatusIcon,
} from "./icons";
import type {
  Priority,
  TaskCreateOptions,
  TaskRecordOption,
  TaskStatus,
} from "./types";

type TaskContext = {
  recordId?: string;
  meetingId?: string;
  label?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
};

type Values = {
  title: string;
  description: string;
  dueDate?: Date;
  priority: Priority;
  status: string;
  assignees: string[];
  linkedRecordIds: string[];
  linkedMeetingIds: string[];
  sectionId: string;
  estimatedTime: string;
};

export function CreateTaskForm({ context }: { context?: TaskContext }) {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [options, setOptions] = useState<TaskCreateOptions>();
  const [linkedRecordIds, setLinkedRecordIds] = useState<string[]>(
    context?.recordId ? [context.recordId] : [],
  );
  const [assignees, setAssignees] = useState<string[]>([]);
  const [linkedMeetingIds, setLinkedMeetingIds] = useState<string[]>(
    context?.meetingId ? [context.meetingId] : [],
  );
  const [sectionId, setSectionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const [nextStatuses, nextOptions] = await Promise.all([
        katoApi.statuses(),
        katoApi.taskCreateOptions(signal),
      ]);
      setStatuses(nextStatuses);
      setOptions(nextOptions);
      setAssignees((current) =>
        current.length > 0 ? current : [nextOptions.currentMemberId],
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setLoadError(
        error instanceof Error ? error.message : "Could not load task options",
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
  }, [loadOptions]);

  const records = useMemo(() => {
    const available = options?.records ?? [];
    if (
      !context?.recordId ||
      available.some((record) => record.id === context.recordId)
    ) {
      return available;
    }
    const contextualRecord: TaskRecordOption = {
      id: context.recordId,
      title: context.label ?? "Linked record",
      objectTypeName: "Record",
      avatarUrl: null,
      icon: "record",
      color: "#8B8B90",
    };
    return [contextualRecord, ...available];
  }, [context?.label, context?.recordId, options?.records]);

  const availableSections = useMemo(() => {
    const selectedRecords = new Set(linkedRecordIds);
    return (options?.sections ?? []).filter((section) =>
      selectedRecords.has(section.recordId),
    );
  }, [linkedRecordIds, options?.sections]);

  useEffect(() => {
    if (
      sectionId &&
      !availableSections.some((section) => section.id === sectionId)
    ) {
      setSectionId("");
    }
  }, [availableSections, sectionId]);

  async function submit(values: Values) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A title is required",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task…",
    });
    try {
      const task = await katoApi.createTask({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        dueDate: values.dueDate?.toISOString(),
        priority: values.priority,
        status: values.status || undefined,
        assignees: values.assignees,
        estimatedTime: values.estimatedTime
          ? Number(values.estimatedTime)
          : undefined,
        linkedRecordIds:
          values.linkedRecordIds.length > 0
            ? values.linkedRecordIds
            : undefined,
        linkedMeetingIds: values.linkedMeetingIds,
        sectionId: values.sectionId || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.message = task.title;
      toast.primaryAction = {
        title: "Open in Kato",
        onAction: () => void open(task.webUrl),
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create task";
      toast.message = (error as Error).message;
    }
  }

  const defaultStatus =
    statuses.find((status) => status.isDefault)?.slug ?? statuses[0]?.slug;
  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      navigationTitle={
        context?.label ? `Follow up: ${context.label}` : "Create Task"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          {loadError ? (
            <Action
              title="Retry Loading Task Options"
              icon={Icon.ArrowClockwise}
              onAction={() => void loadOptions()}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {context?.meetingId && context.label ? (
        <Form.Description title="Linked Meeting" text={context.label} />
      ) : null}
      {loadError ? (
        <Form.Description
          title="Some options are unavailable"
          text={loadError}
        />
      ) : null}
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={context?.suggestedTitle}
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={context?.suggestedDescription}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="no_priority">
        <Form.Dropdown.Item
          value="no_priority"
          title="No Priority"
          icon={taskPriorityIcon("no_priority")}
        />
        <Form.Dropdown.Item
          value="low"
          title="Low"
          icon={taskPriorityIcon("low")}
        />
        <Form.Dropdown.Item
          value="medium"
          title="Medium"
          icon={taskPriorityIcon("medium")}
        />
        <Form.Dropdown.Item
          value="high"
          title="High"
          icon={taskPriorityIcon("high")}
        />
        <Form.Dropdown.Item
          value="urgent"
          title="Urgent"
          icon={taskPriorityIcon("urgent")}
        />
      </Form.Dropdown>
      <Form.Dropdown
        key={defaultStatus}
        id="status"
        title="Status"
        defaultValue={defaultStatus}
      >
        {statuses.map((status) => (
          <Form.Dropdown.Item
            key={status.id}
            value={status.slug}
            title={status.name}
            icon={taskStatusIcon(status)}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="assignees"
        title="Assignees"
        value={assignees}
        onChange={setAssignees}
        placeholder="Assign workspace members"
      >
        {(options?.members ?? []).map((member) => (
          <Form.TagPicker.Item
            key={member.authUserId}
            value={member.authUserId}
            title={member.name?.trim() || member.email}
            icon={profileAvatar(member.name, member.email, member.avatarUrl)}
          />
        ))}
      </Form.TagPicker>
      <Form.TagPicker
        id="linkedRecordIds"
        title="Linked Records"
        value={linkedRecordIds}
        onChange={(recordIds) => setLinkedRecordIds(recordIds.slice(0, 10))}
        placeholder="Link up to 10 records"
      >
        {records.map((record) => (
          <Form.TagPicker.Item
            key={record.id}
            value={record.id}
            title={`${record.title} · ${record.objectTypeName}`}
            icon={recordAvatar(record.title, record.avatarUrl, record.color)}
          />
        ))}
      </Form.TagPicker>
      <Form.TagPicker
        id="linkedMeetingIds"
        title="Linked Meetings"
        value={linkedMeetingIds}
        onChange={(meetingIds) => setLinkedMeetingIds(meetingIds.slice(0, 10))}
        placeholder="Link up to 10 meetings"
      >
        {(options?.meetings ?? []).map((meeting) => (
          <Form.TagPicker.Item
            key={meeting.id}
            value={meeting.id}
            title={meeting.title}
            icon={hugeicon("calendar")}
          />
        ))}
      </Form.TagPicker>
      {availableSections.length > 0 ? (
        <Form.Dropdown
          id="sectionId"
          title="Section"
          value={sectionId}
          onChange={setSectionId}
          info="Sections belong to linked records."
        >
          <Form.Dropdown.Item value="" title="No Section" />
          {availableSections.map((section) => (
            <Form.Dropdown.Item
              key={section.id}
              value={section.id}
              title={
                linkedRecordIds.length > 1
                  ? `${section.name} · ${section.recordTitle}`
                  : section.name
              }
              icon={{ source: Icon.Circle, tintColor: section.color }}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Section"
          text={
            linkedRecordIds.length > 0
              ? "The linked records do not have task sections."
              : "Link a record to choose one of its task sections."
          }
        />
      )}
      <Form.Dropdown id="estimatedTime" title="Estimate" defaultValue="">
        <Form.Dropdown.Item value="" title="No Estimate" />
        <Form.Dropdown.Item value="15" title="15 minutes" />
        <Form.Dropdown.Item value="30" title="30 minutes" />
        <Form.Dropdown.Item value="60" title="1 hour" />
        <Form.Dropdown.Item value="120" title="2 hours" />
        <Form.Dropdown.Item value="240" title="4 hours" />
      </Form.Dropdown>
    </Form>
  );
}

function CreateTaskCommand() {
  return <CreateTaskForm />;
}

export default withAccessToken(accessTokenOptions)(CreateTaskCommand);
