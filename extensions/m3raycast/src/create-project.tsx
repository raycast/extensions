import { ActionPanel, Action, Form, List, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { listClients, listProjectCategories, createProject, getUsername } from "./lib/api";
import { Client, ProjectCategory } from "./lib/types";

// Step 1: Select a client
function ClientSelector({ onSelect }: { onSelect: (client: Client) => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients(search?: string) {
    setIsLoading(true);
    try {
      const result = await listClients(search);
      if (result.result) {
        setClients(result.clients);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load clients",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchChange(text: string) {
    setSearchText(text);
    loadClients(text);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search clients..."
      onSearchTextChange={handleSearchChange}
      throttle
    >
      {clients.map((client) => (
        <List.Item
          key={client.id}
          title={client.name}
          subtitle={client.website || undefined}
          accessories={[{ text: client.status }]}
          actions={
            <ActionPanel>
              <Action title="Select Client" icon={Icon.ArrowRight} onAction={() => onSelect(client)} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && clients.length === 0 && (
        <List.EmptyView
          title="No Clients Found"
          description={searchText ? "Try a different search term" : "Create a client first"}
        />
      )}
    </List>
  );
}

// Step 2: Create Project Form
function ProjectForm({ client }: { client: Client }) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);

  // Form state
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [rate, setRate] = useState("");
  const [discountedRate, setDiscountedRate] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [requestMethod, setRequestMethod] = useState("");
  const [startTimer, setStartTimer] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const result = await listProjectCategories();
      if (result.result) {
        setCategories(result.categories);
      }
    } catch (error) {
      // Ignore errors loading categories
    }
  }

  async function handleSubmit() {
    // Validate required fields
    if (!description.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Project description is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const username = getUsername();

      const result = await createProject({
        client_id: client.id,
        description: description.trim(),
        category_id: categoryId && categoryId !== "new" ? parseInt(categoryId, 10) : undefined,
        category_name: categoryId === "new" && newCategoryName.trim() ? newCategoryName.trim() : undefined,
        rate: rate ? parseFloat(rate.replace(/[$,]/g, "")) : undefined,
        discounted_rate: discountedRate ? parseFloat(discountedRate.replace(/[$,]/g, "")) : undefined,
        estimated_price: estimatedPrice ? parseFloat(estimatedPrice.replace(/[$,]/g, "")) : undefined,
        request_method: requestMethod.trim() || undefined,
        start_timer: startTimer,
        username,
      });

      if (result.result && result.project) {
        const timerText = result.timer_started ? " and timer started" : "";
        await showToast({
          style: Toast.Style.Success,
          title: "Project Created",
          message: `${result.project.description}${timerText}`,
        });
        await popToRoot();
      } else {
        throw new Error(result.error || "Failed to create project");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create project",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`New Project for ${client.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Client" text={client.name} />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter project description"
        value={description}
        onChange={setDescription}
        autoFocus
      />

      <Form.Dropdown id="category" title="Category" value={categoryId} onChange={setCategoryId}>
        <Form.Dropdown.Item value="" title="No Category" />
        {categories.map((cat) => (
          <Form.Dropdown.Item key={cat.id} value={cat.id.toString()} title={cat.name} />
        ))}
        <Form.Dropdown.Item value="new" title="+ Create New Category" />
      </Form.Dropdown>

      {categoryId === "new" && (
        <Form.TextField
          id="newCategoryName"
          title="New Category Name"
          placeholder="Enter new category name"
          value={newCategoryName}
          onChange={setNewCategoryName}
        />
      )}

      <Form.Separator />

      <Form.TextField id="rate" title="Hourly Rate" placeholder="e.g. 150 or $150.00" value={rate} onChange={setRate} />

      <Form.TextField
        id="discountedRate"
        title="Discounted Rate"
        placeholder="e.g. 125 or $125.00 (optional)"
        value={discountedRate}
        onChange={setDiscountedRate}
      />

      <Form.TextField
        id="estimatedPrice"
        title="Estimated Price"
        placeholder="e.g. 500 or $500.00 (optional)"
        value={estimatedPrice}
        onChange={setEstimatedPrice}
      />

      <Form.TextField
        id="requestMethod"
        title="Request Method"
        placeholder="How was this requested? (optional)"
        value={requestMethod}
        onChange={setRequestMethod}
      />

      <Form.Separator />

      <Form.Checkbox id="startTimer" label="Start timer immediately" value={startTimer} onChange={setStartTimer} />
    </Form>
  );
}

export default function CreateProjectCommand() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  if (selectedClient) {
    return <ProjectForm client={selectedClient} />;
  }

  return (
    <ClientSelector
      onSelect={(client) => {
        setSelectedClient(client);
      }}
    />
  );
}
