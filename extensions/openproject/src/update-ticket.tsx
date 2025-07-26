// @ts-nocheck
// src/update-ticket.tsx
import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  LaunchProps,
  List,
  Icon,
  Color,
} from "@raycast/api";
import OpenProjectAPI, { WorkPackage, User } from "./api";

interface FormValues {
  ticketId: string;
  subject: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
}

interface UpdateTicketArguments {
  ticketId?: string;
}

export default function UpdateTicket(
  props: LaunchProps<{ arguments: UpdateTicketArguments }>,
) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [tickets, setTickets] = useState<WorkPackage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<WorkPackage | null>(
    null,
  );
  const [users, setUsers] = useState<User[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [api, setApi] = useState<OpenProjectAPI | null>(null);

  // TypeScript Problem umgehen
  const ListComponent = List as any;
  const ListItem = List.Item as any;
  const ListEmptyView = List.EmptyView as any;
  const ActionPanelComponent = ActionPanel as any;
  const ActionComponent = Action as any;
  const FormComponent = Form as any;
  const FormTextField = Form.TextField as any;
  const FormTextArea = Form.TextArea as any;
  const FormDropdown = Form.Dropdown as any;
  const FormDropdownItem = Form.Dropdown.Item as any;
  const FormDescription = Form.Description as any;
  const SubmitFormAction = Action.SubmitForm as any;

  useEffect(() => {
    async function initializeAPI() {
      try {
        const apiInstance = new OpenProjectAPI();
        setApi(apiInstance);

        // Lade Basis-Daten
        const [usersData, prioritiesData, statusesData] = await Promise.all([
          apiInstance.getUsers(),
          apiInstance.getPriorities(),
          apiInstance.getStatuses(),
        ]);

        setUsers(usersData);
        setPriorities(prioritiesData);
        setStatuses(statusesData);

        // Wenn Ticket-ID als Argument übergeben wurde
        if (props.arguments?.ticketId) {
          try {
            const ticket = await apiInstance.getWorkPackage(
              parseInt(props.arguments.ticketId),
            );
            setSelectedTicket(ticket);
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Ticket not found",
              message: `Ticket #${props.arguments.ticketId} could not be loaded`,
            });
          }
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: "Please check your OpenProject settings",
        });
      }
    }

    initializeAPI();
  }, []);

  // Ticket-Suche
  useEffect(() => {
    if (!api || searchText.trim().length === 0) {
      setTickets([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await api.searchWorkPackages(searchText);
        setTickets(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, api]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case "new":
      case "open":
        return Color.Blue;
      case "in progress":
      case "in development":
        return Color.Yellow;
      case "resolved":
      case "closed":
        return Color.Green;
      case "rejected":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  async function handleSubmit(values: FormValues) {
    if (!api || !selectedTicket) return;

    try {
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating ticket...",
      });

      // Debug: Log was wir senden werden
      console.log("Form values:", values);
      console.log("Current ticket:", selectedTicket);

      const updateData = {
        id: selectedTicket.id,
        subject: values.subject?.trim(),
        description: values.description?.trim(),
        assigneeId:
          values.assignee && values.assignee !== ""
            ? parseInt(values.assignee)
            : 0,
        priorityId:
          values.priority && values.priority !== ""
            ? parseInt(values.priority)
            : undefined,
        statusId:
          values.status && values.status !== ""
            ? parseInt(values.status)
            : undefined,
      };

      console.log("Update data:", updateData);

      await api.updateWorkPackage(updateData);

      toast.style = Toast.Style.Success;
      toast.title = "Ticket updated successfully";
      toast.message = `#${selectedTicket.id}: ${values.subject}`;

      pop();
    } catch (err: any) {
      let errorMessage = "Unknown error";

      console.error("Update error:", err);

      if (err.message?.includes("422")) {
        errorMessage =
          "Invalid data format. Please check all fields are filled correctly.";
      } else if (
        err.message?.includes("Conflict") ||
        err.message?.includes("409")
      ) {
        errorMessage =
          "Ticket was modified by someone else. Please select the ticket again to get the latest version.";
        setSelectedTicket(null);
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

  function selectTicket(ticket: WorkPackage) {
    setSelectedTicket(ticket);
  }

  // Wenn noch kein Ticket ausgewählt wurde, zeige Suchinterface
  if (!selectedTicket) {
    return (
      <ListComponent
        isLoading={isSearching}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for ticket to update..."
        throttle={true}
      >
        {tickets.length === 0 &&
        searchText.trim().length > 0 &&
        !isSearching ? (
          <ListEmptyView
            icon={Icon.MagnifyingGlass}
            title="No tickets found"
            description={`No tickets found matching "${searchText}"`}
          />
        ) : (
          tickets.map((ticket) => (
            <ListItem
              key={ticket.id}
              icon={Icon.Document}
              title={`#${ticket.id} ${ticket.subject}`}
              subtitle={ticket.project?.name || "Unknown Project"}
              accessories={[
                {
                  tag: {
                    value: ticket.status?.name || "Unknown",
                    color: getStatusColor(ticket.status?.name || ""),
                  },
                },
                {
                  text: formatDate(ticket.updatedAt),
                },
              ]}
              actions={
                <ActionPanelComponent>
                  <ActionComponent
                    title="Select Ticket"
                    onAction={() => selectTicket(ticket)}
                    icon={Icon.Pencil}
                  />
                </ActionPanelComponent>
              }
            />
          ))
        )}
      </ListComponent>
    );
  }

  // Ticket ausgewählt - zeige Update-Formular
  return (
    <FormComponent
      isLoading={isLoading}
      actions={
        <ActionPanelComponent>
          <SubmitFormAction
            onSubmit={handleSubmit}
            title="Update Ticket"
            icon={Icon.Check}
          />
          <ActionComponent
            title="Select Different Ticket"
            onAction={() => setSelectedTicket(null)}
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanelComponent>
      }
    >
      <FormDescription
        title="Updating Ticket"
        text={`#${selectedTicket.id} in ${selectedTicket.project?.name || "Unknown Project"}`}
      />

      <FormTextField
        id="subject"
        title="Subject"
        placeholder="Enter ticket subject"
        defaultValue={selectedTicket.subject}
      />

      <FormTextArea
        id="description"
        title="Description"
        placeholder="Enter ticket description"
        defaultValue={selectedTicket.description?.raw || ""}
      />

      <FormDropdown
        id="assignee"
        title="Assignee"
        placeholder="Select assignee"
        defaultValue={selectedTicket.assignee?.id.toString() || ""}
      >
        <FormDropdownItem value="" title="Unassigned" icon="👤" />
        {users.map((user) => (
          <FormDropdownItem
            key={user.id}
            value={user.id.toString()}
            title={user.name}
            icon="👤"
          />
        ))}
      </FormDropdown>

      <FormDropdown
        id="priority"
        title="Priority"
        placeholder="Select priority"
        defaultValue={selectedTicket.priority?.id.toString() || ""}
      >
        {priorities.map((priority) => (
          <FormDropdownItem
            key={priority.id}
            value={priority.id.toString()}
            title={priority.name}
            icon="🔥"
          />
        ))}
      </FormDropdown>

      <FormDropdown
        id="status"
        title="Status"
        placeholder="Select status"
        defaultValue={selectedTicket.status?.id.toString() || ""}
      >
        {statuses.map((status) => (
          <FormDropdownItem
            key={status.id}
            value={status.id.toString()}
            title={status.name}
            icon="⚫"
          />
        ))}
      </FormDropdown>
    </FormComponent>
  );
}
