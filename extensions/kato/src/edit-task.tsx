import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import {
  hugeicon,
  profileAvatar,
  recordAvatar,
  taskPriorityIcon,
  taskStatusIcon,
} from "./icons";
import type {
  Priority,
  Task,
  TaskCreateOptions,
  TaskDetail,
  TaskRecordOption,
  TaskStatus,
} from "./types";

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

export function EditTaskForm({
  taskId,
  onUpdated,
}: {
  taskId: string;
  onUpdated?: (task: Task) => void;
}) {
  const { pop } = useNavigation();
  const [detail, setDetail] = useState<TaskDetail>();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [options, setOptions] = useState<TaskCreateOptions>();
  const [assignees, setAssignees] = useState<string[]>([]);
  const [linkedRecordIds, setLinkedRecordIds] = useState<string[]>([]);
  const [linkedMeetingIds, setLinkedMeetingIds] = useState<string[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const [nextDetail, nextStatuses, nextOptions] = await Promise.all([
          katoApi.task(taskId, signal),
          katoApi.statuses(),
          katoApi.taskCreateOptions(signal),
        ]);
        setDetail(nextDetail);
        setStatuses(nextStatuses);
        setOptions(nextOptions);
        setAssignees(nextDetail.assignees);
        setLinkedRecordIds(
          nextDetail.linkedRecords.map((record) => record.recordId),
        );
        setLinkedMeetingIds(nextDetail.linkedMeetingIds);
        setSectionId(nextDetail.section?.id ?? "");
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error ? cause.message : "Could not load task",
        );
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const records = useMemo(() => {
    const available = options?.records ?? [];
    const knownIds = new Set(available.map((record) => record.id));
    const missing: TaskRecordOption[] = (detail?.linkedRecords ?? [])
      .filter((record) => !knownIds.has(record.recordId))
      .map((record) => ({
        id: record.recordId,
        title: record.title,
        avatarUrl: null,
        objectTypeName: record.objectTypeName,
        icon: record.objectTypeIcon ?? "record",
        color: record.objectTypeColor ?? "#8B8B90",
      }));
    return [...missing, ...available];
  }, [detail?.linkedRecords, options?.records]);

  const meetings = useMemo(() => {
    const available = options?.meetings ?? [];
    const knownIds = new Set(available.map((meeting) => meeting.id));
    return [
      ...(detail?.linkedMeetings ?? []).filter(
        (meeting) => !knownIds.has(meeting.id),
      ),
      ...available,
    ];
  }, [detail?.linkedMeetings, options?.meetings]);

  const sections = useMemo(() => {
    const selected = new Set(linkedRecordIds);
    return (options?.sections ?? []).filter((section) =>
      selected.has(section.recordId),
    );
  }, [linkedRecordIds, options?.sections]);

  useEffect(() => {
    if (sectionId && !sections.some((section) => section.id === sectionId)) {
      setSectionId("");
    }
  }, [sectionId, sections]);

  async function submit(values: Values) {
    if (!values.title.trim()) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving task…",
    });
    try {
      const updated = await katoApi.updateTask(taskId, {
        title: values.title.trim(),
        description: values.description,
        dueDate: values.dueDate?.toISOString() ?? null,
        priority: values.priority,
        status: values.status,
        assignees: values.assignees,
        linkedRecordIds: values.linkedRecordIds,
        linkedMeetingIds: values.linkedMeetingIds,
        sectionId: values.sectionId || null,
        estimatedTime: values.estimatedTime
          ? Number(values.estimatedTime)
          : null,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Task updated";
      toast.message = updated.title;
      onUpdated?.(updated);
      pop();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update task";
      toast.message = (cause as Error).message;
    }
  }

  if (!detail && error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => void load()}
            />
          </ActionPanel>
        }
      >
        <Form.Description title="Could not load task" text={error} />
      </Form>
    );
  }

  return (
    <Form
      key={detail?.updatedAt}
      isLoading={isLoading}
      navigationTitle={detail ? `Edit ${detail.title}` : "Edit Task"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Task"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={detail?.title}
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={detail?.description ?? ""}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={detail?.dueDate ? new Date(detail.dueDate) : undefined}
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={detail?.priority ?? "no_priority"}
      >
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
      <Form.Dropdown id="status" title="Status" defaultValue={detail?.status}>
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
        onChange={(ids) => setLinkedRecordIds(ids.slice(0, 10))}
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
        onChange={(ids) => setLinkedMeetingIds(ids.slice(0, 10))}
      >
        {meetings.map((meeting) => (
          <Form.TagPicker.Item
            key={meeting.id}
            value={meeting.id}
            title={meeting.title}
            icon={hugeicon("calendar")}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="sectionId"
        title="Section"
        value={sectionId}
        onChange={setSectionId}
      >
        <Form.Dropdown.Item value="" title="No Section" />
        {sections.map((section) => (
          <Form.Dropdown.Item
            key={section.id}
            value={section.id}
            title={`${section.recordTitle} · ${section.name}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="estimatedTime"
        title="Estimate"
        defaultValue={detail?.estimatedTime ? String(detail.estimatedTime) : ""}
      >
        <Form.Dropdown.Item value="" title="No Estimate" />
        <Form.Dropdown.Item value="15" title="15 minutes" />
        <Form.Dropdown.Item value="30" title="30 minutes" />
        <Form.Dropdown.Item value="60" title="1 hour" />
        <Form.Dropdown.Item value="120" title="2 hours" />
        <Form.Dropdown.Item value="240" title="4 hours" />
        <Form.Dropdown.Item value="480" title="1 day" />
      </Form.Dropdown>
    </Form>
  );
}
