import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { getCapmoToken } from "./auth";

interface Project {
  id: string;
  name: string;
  project_key: string;
  is_archived?: boolean;
}

interface Ticket {
  id: string;
  name: string;
  ticket_number: number;
  type_id: string;
  category_id: string;
  status: string;
  company_id: string;
  cost?: number | null;
  deadline?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  project_id?: string;
  project_key?: string;
}

export default function ListTickets() {
  const [searchText, setSearchText] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [searchText, selectedProject, allTickets]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      const fetchedProjects = await fetchProjects();
      if (fetchedProjects.length > 0) {
        await fetchAllTickets(fetchedProjects);
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Initialization Error",
        message: "Failed to fetch data. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async (): Promise<Project[]> => {
    const token = getCapmoToken();
    const preferences = getPreferenceValues<{ excludedProjects: string }>();
    const excludedProjectIds = preferences.excludedProjects
      ? preferences.excludedProjects.split(",").map((id) => id.trim())
      : [];

    try {
      const response = await axios.get<{ data: { items: Project[] } }>(
        "https://api.capmo.de/api/v1/projects",
        { headers: { Authorization: token } },
      );

      if (response.data?.data?.items) {
        const sanitizedProjects = response.data.data.items.filter(
          (project) =>
            typeof project.id === "string" &&
            typeof project.project_key === "string" &&
            !project.is_archived && // Exclude archived projects
            !excludedProjectIds.includes(project.id),
        );
        setProjects(sanitizedProjects);
        return sanitizedProjects;
      } else {
        throw new Error("Unexpected response format for projects.");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Fetching Projects",
        message: "Failed to fetch projects. Please check your connection.",
      });
      throw error;
    }
  };

  const fetchAllTickets = async (projects: Project[]) => {
    const token = getCapmoToken();

    try {
      const ticketFetchPromises = projects.map(async (project) => {
        const ticketTypes = await fetchTicketTypes(project.id);
        const ticketCategories = await fetchTicketCategories(project.id);
        const companies = await fetchCompanies(project.id);

        try {
          const response = await axios.get<{ data: { items: Ticket[] } }>(
            `https://api.capmo.de/api/v1/projects/${project.id}/tickets`,
            { headers: { Authorization: token } },
          );

          if (response.data?.data?.items) {
            return response.data.data.items.map((ticket) => ({
              ...ticket,
              project_id: project.id,
              project_key: project.project_key,
              type_id: ticketTypes[ticket.type_id] || ticket.type_id,
              category_id:
                ticketCategories[ticket.category_id] || ticket.category_id,
              company_id: companies[ticket.company_id] || ticket.company_id,
              created_at: formatDate(ticket.created_at),
              updated_at: formatDate(ticket.updated_at),
              deadline: formatDate(ticket.deadline),
              status: mapStatus(ticket.status),
            }));
          } else {
            return [];
          }
        } catch (error) {
          console.error(
            `Error fetching tickets for project ${project.id}:`,
            error,
          );
          return [];
        }
      });

      const results = await Promise.all(ticketFetchPromises);
      const combinedTickets = results.flat();
      setAllTickets(combinedTickets);
      setTickets(combinedTickets);
    } catch (error) {
      console.error(error); // Example usage
    }
  };

  const fetchTicketTypes = async (
    projectId: string,
  ): Promise<{ [key: string]: string }> => {
    const token = getCapmoToken();

    try {
      const response = await axios.get<{
        data: { items: { id: string; name: string }[] };
      }>(`https://api.capmo.de/api/v1/projects/${projectId}/ticket-types`, {
        headers: { Authorization: token },
      });

      if (response.data?.data?.items) {
        return response.data.data.items.reduce(
          (map, type) => {
            map[type.id] = type.name;
            return map;
          },
          {} as { [key: string]: string },
        );
      } else {
        return {};
      }
    } catch (error) {
      console.error(
        `Error fetching ticket types for project ${projectId}:`,
        error,
      );
      return {};
    }
  };

  const fetchTicketCategories = async (
    projectId: string,
  ): Promise<{ [key: string]: string }> => {
    const token = getCapmoToken();

    try {
      const response = await axios.get<{
        data: { items: { id: string; name: string }[] };
      }>(
        `https://api.capmo.de/api/v1/projects/${projectId}/ticket-categories`,
        { headers: { Authorization: token } },
      );

      if (response.data?.data?.items) {
        return response.data.data.items.reduce(
          (map, category) => {
            map[category.id] = category.name;
            return map;
          },
          {} as { [key: string]: string },
        );
      } else {
        return {};
      }
    } catch (error) {
      console.error(
        `Error fetching ticket categories for project ${projectId}:`,
        error,
      );
      return {};
    }
  };

  const fetchCompanies = async (
    projectId: string,
  ): Promise<{ [key: string]: string }> => {
    const token = getCapmoToken();

    try {
      const response = await axios.get<{
        data: { items: { id: string; name: string }[] };
      }>(`https://api.capmo.de/api/v1/projects/${projectId}/companies`, {
        headers: { Authorization: token },
      });

      if (response.data?.data?.items) {
        return response.data.data.items.reduce(
          (map, company) => {
            map[company.id] = company.name;
            return map;
          },
          {} as { [key: string]: string },
        );
      } else {
        return {};
      }
    } catch (error) {
      console.error(
        `Error fetching companies for project ${projectId}:`,
        error,
      );
      return {};
    }
  };

  const updateTicketStatus = async (
    ticket: Ticket,
    newStatus: string,
    displayStatus: string,
  ) => {
    try {
      const token = getCapmoToken();
      await axios.patch(
        `https://api.capmo.de/api/v1/projects/${ticket.project_id}/tickets/${ticket.id}`,
        { status: newStatus },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        },
      );
      showToast({
        style: Toast.Style.Success,
        title: `Ticket ${displayStatus}`,
        message: `Das Ticket "${ticket.project_key || "Unknown"}-${ticket.ticket_number}" wurde erfolgreich ${displayStatus.toLowerCase()}.`,
      });

      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t.id === ticket.id ? { ...t, status: displayStatus } : t,
        ),
      );
      setAllTickets((prevAllTickets) =>
        prevAllTickets.map((t) =>
          t.id === ticket.id ? { ...t, status: displayStatus } : t,
        ),
      );
    } catch (error) {
      console.error(`Error updating ticket status to ${newStatus}:`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Fehler beim Aktualisieren des Tickets",
        message: `Das Ticket konnte nicht auf "${displayStatus}" gesetzt werden. Bitte versuchen Sie es erneut.`,
      });
    }
  };

  const filterTickets = () => {
    let filteredTickets = allTickets;

    if (selectedProject !== "all") {
      filteredTickets = filteredTickets.filter(
        (ticket) => ticket.project_id === selectedProject,
      );
    }

    if (searchText) {
      filteredTickets = filteredTickets.filter((ticket) => {
        const searchableFields = [
          ticket.name || "",
          ticket.type_id || "",
          ticket.category_id || "",
          ticket.company_id || "",
          ticket.status || "",
          `${ticket.project_key || "Unknown"}-${ticket.ticket_number}` || "",
        ];

        return searchableFields.some((field) =>
          field.toLowerCase().includes(searchText.toLowerCase()),
        );
      });
    }

    setTickets(filteredTickets);
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A"; // Handle undefined here
    const d = new Date(date);
    return d.toLocaleDateString("de-DE").replace(/\./g, ".");
  };

  const mapStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      IN_PROGRESS: "In Bearbeitung",
      CLOSED: "Geschlossen",
      OPEN: "Offen",
      SIGNED_OFF: "Freigemeldet",
    };
    return statusMap[status] || status;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tickets..."
      isShowingDetail
      onSearchTextChange={(text) => setSearchText(text)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          storeValue
          onChange={(value) => setSelectedProject(value || "all")}
        >
          <List.Dropdown.Item title="Alle Projekte" value="all" />
          {projects
            .filter((project) => !project.is_archived) // Exclude archived projects
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => (
              <List.Dropdown.Item
                key={project.id}
                title={project.name}
                value={project.id}
              />
            ))}
        </List.Dropdown>
      }
    >
      {tickets.map((ticket) => (
        <List.Item
          key={ticket.id}
          title={`${ticket.project_key || "Unknown"}-${ticket.ticket_number}`}
          icon={Icon.Document}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    text={ticket.name || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Abteilung"
                    text={ticket.type_id || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Kategorie"
                    text={ticket.category_id || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={ticket.status || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Firma"
                    text={ticket.company_id || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Kosten"
                    text={ticket.cost?.toString() || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Frist"
                    text={ticket.deadline || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Beschreibung"
                    text={ticket.description || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Erstellt am"
                    text={ticket.created_at || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Geändert am"
                    text={ticket.updated_at || "N/A"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://app.capmo.de/projects/${ticket.project_id}/tickets?ticketId=${ticket.id}#ticketsFormTab`}
              />
              <Action.OpenInBrowser
                title="Open Project"
                url={`https://app.capmo.de/projects/${ticket.project_id}/tickets?view=all`}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action
                title="Ticket freimelden"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() =>
                  updateTicketStatus(ticket, "SIGNED_OFF", "Freigemeldet")
                }
              />
              <Action
                title="Ticket bearbeiten"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={() =>
                  updateTicketStatus(ticket, "IN_PROGRESS", "In Bearbeitung")
                }
              />
              <Action
                title="Ticket schließen"
                icon={Icon.Lock}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={() =>
                  updateTicketStatus(ticket, "CLOSED", "Geschlossen")
                }
              />
              <Action
                title="Ticket öffnen"
                icon={Icon.LockUnlocked}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => updateTicketStatus(ticket, "OPEN", "Offen")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
