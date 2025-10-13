import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { useOwners } from "@/hooks/useOwners";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeals } from "@/hooks/useDeals";

interface FormValues {
  title: string;
  notes: string;
  owner: string;
  priority: string;
  type: string;
  dueDate: Date;
  contactId: string;
  companyId: string;
  dealId: string;
}

export default function Command() {
  const { isLoading: isLoadingOwners, data: ownersData } = useOwners();
  const authHeaders = useAuthHeaders();
  const owners = ownersData?.results || [];

  // Default due date: 2 days from now
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 2);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");

  const { isLoading: isLoadingContacts, data: contactsData } = useContacts({ search: contactSearch });
  const { isLoading: isLoadingCompanies, data: companiesData } = useCompanies({ search: companySearch });
  const { isLoading: isLoadingDeals, data: dealsData } = useDeals({ search: dealSearch });

  const contacts = contactsData?.results || [];
  const companies = companiesData?.results || [];
  const deals = dealsData?.results || [];

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      // Convert date to timestamp in milliseconds
      const timestamp = values.dueDate.getTime();

      // Build associations array
      const associations = [];

      if (values.contactId) {
        associations.push({
          to: { id: values.contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 204,
            },
          ],
        });
      }

      if (values.companyId) {
        associations.push({
          to: { id: values.companyId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 192,
            },
          ],
        });
      }

      if (values.dealId) {
        associations.push({
          to: { id: values.dealId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 216,
            },
          ],
        });
      }

      interface TaskRequestBody {
        properties: {
          hs_task_subject: string;
          hs_task_body: string;
          hs_timestamp: string;
          hubspot_owner_id?: string;
          hs_task_priority?: string;
          hs_task_type: string;
        };
        associations?: Array<{
          to: { id: string };
          types: Array<{
            associationCategory: string;
            associationTypeId: number;
          }>;
        }>;
      }

      const requestBody: TaskRequestBody = {
        properties: {
          hs_task_subject: values.title,
          hs_task_body: values.notes,
          hs_timestamp: timestamp.toString(),
          hubspot_owner_id: values.owner || undefined,
          hs_task_priority: values.priority || undefined,
          hs_task_type: values.type,
        },
      };

      if (associations.length > 0) {
        requestBody.associations = associations;
      }

      const response = await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || `Failed to create task: ${response.statusText}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: values.title,
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoadingOwners || isSubmitting || isLoadingContacts || isLoadingCompanies || isLoadingDeals}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter task title" />
      <Form.TextArea id="notes" title="Notes" placeholder="Enter task notes (optional)" />
      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={defaultDueDate} />
      <Form.Dropdown id="owner" title="Owner" defaultValue="">
        <Form.Dropdown.Item title="No Owner" value="" />
        {owners.map((owner) => (
          <Form.Dropdown.Item key={owner.id} title={`${owner.firstName} ${owner.lastName}`} value={owner.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="">
        <Form.Dropdown.Item title="None" value="" />
        <Form.Dropdown.Item title="Low" value="LOW" />
        <Form.Dropdown.Item title="Medium" value="MEDIUM" />
        <Form.Dropdown.Item title="High" value="HIGH" />
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Type" defaultValue="TODO">
        <Form.Dropdown.Item title="To-Do" value="TODO" />
        <Form.Dropdown.Item title="Email" value="EMAIL" />
        <Form.Dropdown.Item title="Call" value="CALL" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="Associations" text="Optionally associate this task with records" />
      <Form.Dropdown
        id="contactId"
        title="Contact"
        defaultValue=""
        throttle
        onSearchTextChange={setContactSearch}
        info="Search and select a contact to associate with this task"
      >
        <Form.Dropdown.Item title="No Contact" value="" />
        {contacts.map((contact) => {
          const name =
            `${contact.properties?.firstname || ""} ${contact.properties?.lastname || ""}`.trim() || "Unnamed";
          const email = contact.properties?.email ? ` (${contact.properties.email})` : "";
          return <Form.Dropdown.Item key={contact.id} title={`${name}${email}`} value={contact.id} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown
        id="companyId"
        title="Company"
        defaultValue=""
        throttle
        onSearchTextChange={setCompanySearch}
        info="Search and select a company to associate with this task"
      >
        <Form.Dropdown.Item title="No Company" value="" />
        {companies.map((company) => {
          const name = company.properties?.name || "Unnamed Company";
          const domain = company.properties?.domain ? ` (${company.properties.domain})` : "";
          return <Form.Dropdown.Item key={company.id} title={`${name}${domain}`} value={company.id} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown
        id="dealId"
        title="Deal"
        defaultValue=""
        throttle
        onSearchTextChange={setDealSearch}
        info="Search and select a deal to associate with this task"
      >
        <Form.Dropdown.Item title="No Deal" value="" />
        {deals.map((deal) => {
          const name = deal.properties?.dealname || "Unnamed Deal";
          const amount = deal.properties?.amount ? ` - $${deal.properties.amount}` : "";
          return <Form.Dropdown.Item key={deal.id} title={`${name}${amount}`} value={deal.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
