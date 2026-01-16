import { ActionPanel, Action, Form, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState } from "react";
import { createClient, checkClientExists } from "./lib/api";
import { CLIENT_STATUS_OPTIONS } from "./lib/types";

export default function CreateClientCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  // Form state
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [status, setStatus] = useState("Potential");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Check if client exists when name field loses focus
  async function handleNameBlur() {
    if (!name.trim()) {
      setNameError(undefined);
      return;
    }

    try {
      const result = await checkClientExists(name.trim());
      if (result.exists && result.client) {
        const archivedText = result.client.archived ? " (archived)" : "";
        setNameError(`Client "${result.client.name}" already exists${archivedText}`);
      } else {
        setNameError(undefined);
      }
    } catch (error) {
      // Ignore errors during check - will be caught on submit
      setNameError(undefined);
    }
  }

  async function handleSubmit() {
    // Validate required fields
    if (!name.trim()) {
      setNameError("Client name is required");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createClient({
        name: name.trim(),
        legal_name: legalName.trim() || undefined,
        status,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
      });

      if (result.result && result.client) {
        await showToast({
          style: Toast.Style.Success,
          title: "Client Created",
          message: `${result.client.name} has been created`,
        });
        await popToRoot();
      } else if (result.existing_client) {
        setNameError(`Client "${result.existing_client.name}" already exists`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Client Already Exists",
          message: result.error || "A client with this name already exists",
        });
      } else {
        throw new Error(result.error || "Failed to create client");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create client",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Client" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Client Name"
        placeholder="Enter client name"
        value={name}
        onChange={setName}
        onBlur={handleNameBlur}
        error={nameError}
        autoFocus
      />

      <Form.TextField
        id="legalName"
        title="Legal Name"
        placeholder="Enter legal name (optional)"
        value={legalName}
        onChange={setLegalName}
      />

      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus}>
        {CLIENT_STATUS_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="contactName"
        title="Contact Name"
        placeholder="Enter primary contact name"
        value={contactName}
        onChange={setContactName}
      />

      <Form.TextField
        id="contactEmail"
        title="Contact Email"
        placeholder="Enter primary contact email"
        value={contactEmail}
        onChange={setContactEmail}
      />

      <Form.TextField
        id="contactPhone"
        title="Contact Phone"
        placeholder="Enter primary contact phone"
        value={contactPhone}
        onChange={setContactPhone}
      />

      <Form.TextField
        id="website"
        title="Website"
        placeholder="Enter website URL"
        value={website}
        onChange={setWebsite}
      />
    </Form>
  );
}
