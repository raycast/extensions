import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { listProjects, listSprints } from "./lib/api/directory";
import { describeError } from "./lib/api/errors";
import { createTicket } from "./lib/api/tickets";
import { TICKET_TYPES, TYPE_LABELS, type TicketType } from "./lib/domain/enums";
import { derivePriority, isPastDue } from "./lib/domain/priority";
import { useDirectory } from "./lib/hooks/use-directory";
import { useSession } from "./lib/hooks/use-session";
import { priorityLabel, userAvatar } from "./lib/ui/presentation";
import { AuthErrorView } from "./views/auth-error";
import { TicketDetail } from "./views/ticket-detail";

interface FormValues {
  title: string;
  description: string;
  type: string;
  owningDepartmentId: string;
  assigneeUserId: string;
  projectId: string;
  sprintId: string;
  dueDate: Date | null;
  needsResponse: boolean;
}

export default function CreateTicketCommand() {
  const { push } = useNavigation();
  const { error: sessionError } = useSession();
  const { lookup, isLoading: isDirectoryLoading } = useDirectory();

  const { data: projects } = useCachedPromise(listProjects, [], { keepPreviousData: true });
  const [projectId, setProjectId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const { data: sprints } = useCachedPromise(listSprints, [projectId], {
    execute: projectId.length > 0,
    keepPreviousData: false,
  });

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  if (sessionError) {
    return <AuthErrorView error={sessionError} />;
  }

  const clearError = (field: string) => setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = async (values: FormValues) => {
    const nextErrors: Record<string, string | undefined> = {};

    if (!values.title.trim()) nextErrors.title = "Give the ticket a title";
    if (!values.description.trim()) nextErrors.description = "Describe what needs attention";
    if (!values.owningDepartmentId) nextErrors.owningDepartmentId = "Choose an owning department";
    if (isPastDue(values.dueDate)) {
      nextErrors.dueDate = "Pick a future date. A past due date breaches its SLA immediately.";
    }

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating ticket…" });
    setIsSubmitting(true);

    try {
      const ticket = await createTicket({
        title: values.title.trim(),
        description: values.description.trim(),
        type: values.type as TicketType,
        owningDepartmentId: values.owningDepartmentId,
        assigneeUserId: values.assigneeUserId || undefined,
        projectId: values.projectId || undefined,
        sprintId: values.projectId ? values.sprintId || undefined : undefined,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        needsResponse: values.needsResponse,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Ticket created";
      toast.message = ticket.ticketNumber;
      push(<TicketDetail ticketId={ticket.id} />);
    } catch (error) {
      const message = describeError(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create ticket";
      toast.message = message;
      toast.primaryAction = {
        title: "Copy Error",
        onAction: (shown) => {
          Clipboard.copy(message);
          shown.hide();
        },
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const derived = derivePriority(dueDate);

  return (
    <Form
      isLoading={isDirectoryLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Ticket" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Ticket Title"
        placeholder="Briefly summarize the request or issue"
        error={errors.title}
        onChange={() => clearError("title")}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What happened, and what should happen instead"
        info="Everyone who can read the ticket can read this. Use a comment marked as an internal note for anything sensitive."
        error={errors.description}
        onChange={() => clearError("description")}
        enableMarkdown
      />

      <Form.Dropdown id="type" title="Ticket Type" defaultValue="GENERAL_SUPPORT" storeValue>
        {TICKET_TYPES.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={TYPE_LABELS[value]} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="owningDepartmentId"
        title="Department"
        error={errors.owningDepartmentId}
        onChange={() => clearError("owningDepartmentId")}
        storeValue
      >
        {lookup.departments.map((department) => (
          <Form.Dropdown.Item key={department.id} value={department.id} title={department.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="assigneeUserId"
        title="Assignee"
        info="Left unassigned, the ticket routes itself to the department manager, or to the PMO and project manager when a project is set."
      >
        <Form.Dropdown.Item value="" title="Unassigned (Auto-Route)" icon={Icon.Wand} />
        {lookup.users.map((user) => (
          <Form.Dropdown.Item
            key={user.id}
            value={user.id}
            title={user.displayName}
            icon={userAvatar(user.displayName)}
          />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown
          id="projectId"
          title="Project"
          value={projectId}
          onChange={(value) => {
            setProjectId(value);
            setSprintId("");
          }}
        >
          <Form.Dropdown.Item value="" title="No Project" />
          {projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
          ))}
        </Form.Dropdown>
      ) : null}

      {projectId && sprints && sprints.length > 0 ? (
        <Form.Dropdown
          id="sprintId"
          title="Sprint"
          value={sprintId}
          onChange={setSprintId}
          info="Only open sprints can accept new tickets."
        >
          <Form.Dropdown.Item value="" title="Project Backlog" />
          {sprints.map((sprint) => (
            <Form.Dropdown.Item key={sprint.id} value={sprint.id} title={sprint.label} />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Separator />

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
        value={dueDate}
        onChange={(value) => {
          setDueDate(value);
          clearError("dueDate");
        }}
        error={errors.dueDate}
      />

      <Form.Description
        title="Priority"
        text={
          dueDate
            ? `${priorityLabel(derived)} — set by how soon this is due.`
            : `${priorityLabel(derived)} — set by how soon this is due. Without a due date, tickets are Normal.`
        }
      />

      <Form.Checkbox
        id="needsResponse"
        title="Follow-Up"
        label="Needs response — notify me when closed"
        info="You are told when someone else closes this ticket."
      />
    </Form>
  );
}
