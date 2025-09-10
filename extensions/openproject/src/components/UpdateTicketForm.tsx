import { Action, ActionPanel, Form, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { UpdateTicketFormValues, WorkPackage, User, Priority, Status } from "../types";
import OpenProjectAPI from "../api";

interface UpdateTicketFormProps {
  ticket: WorkPackage;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function UpdateTicketForm({ ticket, onSuccess, onBack }: UpdateTicketFormProps) {
  const { pop } = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(true);

  const api = new OpenProjectAPI();

  useEffect(() => {
    async function loadFormData() {
      try {
        setIsLoadingForm(true);

        const [usersData, prioritiesData, statusesData] = await Promise.all([
          api.getUsers(),
          api.getPriorities(),
          api.getStatuses(),
        ]);

        setUsers(usersData);
        setPriorities(prioritiesData);
        setStatuses(statusesData);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading form data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingForm(false);
      }
    }

    loadFormData();
  }, [ticket.id]);

  async function handleSubmit(values: UpdateTicketFormValues) {
    try {
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating ticket...",
      });

      const updateData = {
        id: ticket.id,
        subject: values.subject?.trim(),
        description: values.description?.trim(),
        assigneeId: values.assignee && values.assignee !== "" ? parseInt(values.assignee) : 0,
        priorityId: values.priority && values.priority !== "" ? parseInt(values.priority) : undefined,
        statusId: values.status && values.status !== "" ? parseInt(values.status) : undefined,
      };

      await api.updateWorkPackage(updateData);

      toast.style = Toast.Style.Success;
      toast.title = "Ticket updated successfully";
      toast.message = `#${ticket.id}: ${values.subject}`;

      onSuccess?.();
      pop();
    } catch (err: any) {
      let errorMessage = "Unknown error";

      if (err.message?.includes("422")) {
        errorMessage = "Invalid data format. Please check all fields are filled correctly.";
      } else if (err.message?.includes("Conflict") || err.message?.includes("409")) {
        errorMessage = "Ticket was modified by someone else. Please try again.";
      } else {
        errorMessage = err.message || "Unknown error";
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Error updating ticket",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isLoadingForm}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Update Ticket" icon={Icon.Check} />
          {onBack && (
            <Action
              title="Select Different Ticket"
              onAction={onBack}
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Updating Ticket"
        text={`#${ticket.id} in ${ticket.project?.name || "Unknown Project"}`}
      />

      <Form.TextField id="subject" title="Subject" placeholder="Enter ticket subject" defaultValue={ticket.subject} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter ticket description"
        defaultValue={ticket.description?.raw || ""}
      />

      <Form.Dropdown
        id="assignee"
        title="Assignee"
        placeholder="Select assignee"
        defaultValue={ticket.assignee?.id.toString() || ""}
      >
        <Form.Dropdown.Item value="" title="Unassigned" icon="👤" />
        {users.map((user) => (
          <Form.Dropdown.Item key={user.id} value={user.id.toString()} title={user.name} icon="👤" />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        placeholder="Select priority"
        defaultValue={ticket.priority?.id.toString() || ""}
      >
        {priorities.map((priority) => (
          <Form.Dropdown.Item key={priority.id} value={priority.id.toString()} title={priority.name} icon="🔥" />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="status"
        title="Status"
        placeholder="Select status"
        defaultValue={ticket.status?.id.toString() || ""}
      >
        {statuses.map((status) => (
          <Form.Dropdown.Item key={status.id} value={status.id.toString()} title={status.name} icon="⚫" />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
