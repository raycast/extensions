import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useAccountInfo } from "@/hooks/useAccountInfo";
import { useOwners } from "@/hooks/useOwners";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import type { Task } from "@/types/task";
import { showFailureToast } from "@raycast/utils";

interface AssociationResult {
  id: string;
  type: string;
}

interface TaskAssociations {
  contacts?: { results: AssociationResult[] };
  contact?: { results: AssociationResult[] };
  companies?: { results: AssociationResult[] };
  company?: { results: AssociationResult[] };
  deals?: { results: AssociationResult[] };
  deal?: { results: AssociationResult[] };
}

interface TaskWithAssociations {
  id: string;
  associations?: TaskAssociations;
}

interface ContactRecord {
  id: string;
  properties?: {
    firstname?: string;
    lastname?: string;
  };
}

interface CompanyRecord {
  id: string;
  properties?: {
    name?: string;
  };
}

interface DealRecord {
  id: string;
  properties?: {
    dealname?: string;
  };
}

const Detail = ({
  task,
  hubspotUrl,
  ownerName,
  authHeaders,
  uiDomain,
  portalId,
}: {
  task: Task;
  hubspotUrl: string;
  ownerName?: string;
  authHeaders: Record<string, string>;
  uiDomain?: string;
  portalId?: string;
}) => {
  const subject = task?.properties?.hs_task_subject;
  const body = task?.properties?.hs_task_body;
  const status = task?.properties?.hs_task_status;
  const priority = task?.properties?.hs_task_priority;
  const dueDate = task?.properties?.hs_timestamp;
  const taskType = task?.properties?.hs_task_type;
  const createdate = task?.properties?.createdate;
  const id = task?.id;

  const formatDueDate = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatStatus = (status: string) => {
    if (status === "NOT_STARTED") return "Not Started";
    if (status === "COMPLETED") return "Completed";
    return status;
  };

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  };

  const formatTaskType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Fetch associated records details

  const [associatedContacts, setAssociatedContacts] = useState<ContactRecord[]>([]);
  const [associatedCompanies, setAssociatedCompanies] = useState<CompanyRecord[]>([]);
  const [associatedDeals, setAssociatedDeals] = useState<DealRecord[]>([]);

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        // Fetch the task with associations
        const response = await fetch(
          `https://api.hubapi.com/crm/v3/objects/tasks/${task.id}?associations=${encodeURIComponent("contact,company,deal")}`,
          { headers: authHeaders },
        );
        const taskWithAssociations = (await response.json()) as TaskWithAssociations;

        const fetchedContactIds = (
          taskWithAssociations.associations?.contacts?.results ||
          taskWithAssociations.associations?.contact?.results ||
          []
        ).map((c) => c.id);
        const fetchedCompanyIds = (
          taskWithAssociations.associations?.companies?.results ||
          taskWithAssociations.associations?.company?.results ||
          []
        ).map((c) => c.id);
        const fetchedDealIds = (
          taskWithAssociations.associations?.deals?.results ||
          taskWithAssociations.associations?.deal?.results ||
          []
        ).map((d) => d.id);

        // Fetch contacts
        if (fetchedContactIds.length > 0) {
          const contactPromises = fetchedContactIds.map((id: string) =>
            fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`, { headers: authHeaders })
              .then((r) => r.json())
              .catch(() => null),
          );
          const contacts = await Promise.all(contactPromises);
          setAssociatedContacts(contacts.filter(Boolean) as ContactRecord[]);
        }

        // Fetch companies
        if (fetchedCompanyIds.length > 0) {
          const companyPromises = fetchedCompanyIds.map((id: string) =>
            fetch(`https://api.hubapi.com/crm/v3/objects/companies/${id}`, { headers: authHeaders })
              .then((r) => r.json())
              .catch(() => null),
          );
          const companies = await Promise.all(companyPromises);
          setAssociatedCompanies(companies.filter(Boolean) as CompanyRecord[]);
        }

        // Fetch deals
        if (fetchedDealIds.length > 0) {
          const dealPromises = fetchedDealIds.map((id: string) =>
            fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}`, { headers: authHeaders })
              .then((r) => r.json())
              .catch(() => null),
          );
          const deals = await Promise.all(dealPromises);
          setAssociatedDeals(deals.filter(Boolean) as DealRecord[]);
        }
      } catch (error) {
        console.error("Error fetching associations:", error);
      }
    };

    fetchAssociations();
  }, [task.id]);

  return (
    <List.Item.Detail
      markdown={body ? `## ${subject}\n\n${body}` : `## ${subject}`}
      metadata={
        <List.Item.Detail.Metadata>
          {status && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={formatStatus(status)}
                color={status === "COMPLETED" ? Color.Green : Color.Red}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {priority && <List.Item.Detail.Metadata.Label title="Priority" text={formatPriority(priority)} />}
          {taskType && <List.Item.Detail.Metadata.Label title="Type" text={formatTaskType(taskType)} />}
          <List.Item.Detail.Metadata.Label title="Owner" text={ownerName} />
          {dueDate && <List.Item.Detail.Metadata.Label title="Due Date" text={formatDueDate(dueDate)} />}
          {createdate && <List.Item.Detail.Metadata.Label title="Created Date" text={createdate} />}
          {id && <List.Item.Detail.Metadata.Link title="HubSpot Link" text="View in HubSpot" target={hubspotUrl} />}

          <List.Item.Detail.Metadata.Separator />

          {associatedContacts.length > 0 ? (
            associatedContacts.map((contact) => {
              const name =
                `${contact.properties?.firstname || ""} ${contact.properties?.lastname || ""}`.trim() || "Unnamed";
              const contactUrl = `https://${uiDomain}/contacts/${portalId}/contact/${contact.id}`;
              return (
                <List.Item.Detail.Metadata.Link key={contact.id} title="Contact" text={name} target={contactUrl} />
              );
            })
          ) : (
            <List.Item.Detail.Metadata.Label title="Contact" text="No Contact" />
          )}

          {associatedCompanies.length > 0 ? (
            associatedCompanies.map((company) => {
              const name = company.properties?.name || "Unnamed Company";
              const companyUrl = `https://${uiDomain}/contacts/${portalId}/company/${company.id}`;
              return (
                <List.Item.Detail.Metadata.Link key={company.id} title="Company" text={name} target={companyUrl} />
              );
            })
          ) : (
            <List.Item.Detail.Metadata.Label title="Company" text="No Company" />
          )}

          {associatedDeals.length > 0 ? (
            associatedDeals.map((deal) => {
              const name = deal.properties?.dealname || "Unnamed Deal";
              const dealUrl = `https://${uiDomain}/contacts/${portalId}/deal/${deal.id}`;
              return <List.Item.Detail.Metadata.Link key={deal.id} title="Deal" text={name} target={dealUrl} />;
            })
          ) : (
            <List.Item.Detail.Metadata.Label title="Deal" text="No Deal" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const { isLoading, data, revalidate } = useTasks({ search, ownerId });
  const { isLoading: isLoadingAccountInfo, data: dataAccountInfo } = useAccountInfo();
  const { isLoading: isLoadingOwners, data: ownersData } = useOwners();
  const authHeaders = useAuthHeaders();

  const tasks: Task[] | undefined = data?.results;
  const owners = ownersData?.results || [];

  const markAsComplete = async (taskId: string, taskSubject: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Marking task as complete...",
      });

      const response = await fetch(`https://api.hubapi.com/crm/v3/objects/tasks/${taskId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          properties: {
            hs_task_status: "COMPLETED",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: taskSubject,
      });

      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const markAsIncomplete = async (taskId: string, taskSubject: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Marking task as incomplete...",
      });

      const response = await fetch(`https://api.hubapi.com/crm/v3/objects/tasks/${taskId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          properties: {
            hs_task_status: "NOT_STARTED",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Task marked as incomplete",
        message: taskSubject,
      });

      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update task" });
    }
  };

  return (
    <List
      isLoading={isLoading || isLoadingAccountInfo || isLoadingOwners}
      isShowingDetail={showingDetail}
      searchText={search}
      throttle
      onSearchTextChange={(search) => {
        setSearch(search);
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Owner" value={ownerId} onChange={(newValue) => setOwnerId(newValue)}>
          <List.Dropdown.Item title="All Owners" value="" />
          {owners.map((owner) => (
            <List.Dropdown.Item key={owner.id} title={`${owner.firstName} ${owner.lastName}`} value={owner.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Tasks Found" icon="noview.png" />
      {tasks?.map((task) => {
        const subject = task?.properties?.hs_task_subject;
        const status = task?.properties?.hs_task_status;
        const priority = task?.properties?.hs_task_priority;
        const dueDate = task?.properties?.hs_timestamp;
        const ownerId = task?.properties?.hubspot_owner_id;
        const id = task?.id;
        const hubspotUrl = `https://${dataAccountInfo?.uiDomain}/tasks/${dataAccountInfo?.portalId}/view/all/task/${id}`;

        const owner = owners.find((o) => o.id === ownerId);
        const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : "No Owner";

        const formatDueDate = (timestamp: string) => {
          if (!timestamp) return "";
          const date = new Date(timestamp);
          return date.toLocaleDateString();
        };

        const formatStatus = (status: string) => {
          if (status === "NOT_STARTED") return "Not Started";
          if (status === "COMPLETED") return "Completed";
          return status;
        };

        const formatPriority = (priority: string) => {
          return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        };

        const getPriorityColor = (priority: string) => {
          if (priority === "HIGH") return Color.Red;
          if (priority === "MEDIUM") return Color.Orange;
          if (priority === "LOW") return Color.Blue;
          return Color.SecondaryText;
        };

        const props = showingDetail
          ? {
              detail: (
                <Detail
                  task={task}
                  hubspotUrl={hubspotUrl}
                  ownerName={ownerName}
                  authHeaders={authHeaders}
                  uiDomain={dataAccountInfo?.uiDomain}
                  portalId={dataAccountInfo?.portalId}
                />
              ),
            }
          : {
              accessories: [
                { tag: { value: formatPriority(priority), color: getPriorityColor(priority) } },
                { text: formatDueDate(dueDate) },
                { tag: { value: formatStatus(status), color: status === "COMPLETED" ? Color.Green : Color.Red } },
              ],
            };

        return (
          <List.Item
            key={task.id}
            title={subject || "Untitled Task"}
            keywords={[subject, status, priority]}
            id={task.id}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action
                  title="Open in HubSpot"
                  onAction={async () => {
                    await open(hubspotUrl);
                    await closeMainWindow();
                  }}
                  icon={{ source: Icon.ArrowRight }}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Mark as Complete"
                  onAction={() => markAsComplete(id, subject || "Untitled Task")}
                  icon={{ source: Icon.Checkmark }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action
                  title="Mark as Incomplete"
                  onAction={() => markAsIncomplete(id, subject || "Untitled Task")}
                  icon={{ source: Icon.XMarkCircle }}
                />
                <Action
                  title="Copy Task ID"
                  onAction={async () => {
                    await Clipboard.copy(id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Task ID copied",
                      message: id,
                    });
                  }}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
