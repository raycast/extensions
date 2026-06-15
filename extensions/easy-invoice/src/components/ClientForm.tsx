import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addClient, updateClient } from "../lib/storage";
import { Client } from "../lib/types";

interface ClientFormProps {
  client?: Client;
  onSaved: () => void;
}

export default function ClientForm({ client, onSaved }: ClientFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const isEditing = !!client;

  async function handleSubmit(values: { name: string; contactName: string; email: string; address: string }) {
    const name = values.name.trim();
    const contactName = values.contactName.trim();
    const email = values.email.trim();
    const address = values.address.trim();

    if (!name) {
      setNameError("Name is required");
      return;
    }
    if (!email) {
      setEmailError("Email is required");
      return;
    }

    try {
      const now = new Date().toISOString();
      if (isEditing) {
        await updateClient({
          ...client,
          name,
          contactName,
          email,
          address,
          updatedAt: now,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Client updated",
        });
      } else {
        await addClient({
          id: uuidv4(),
          name,
          contactName,
          email,
          address,
          createdAt: now,
          updatedAt: now,
        });
        await showToast({ style: Toast.Style.Success, title: "Client added" });
      }
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update client" : "Failed to add client",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Client" : "Add Client"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Client" : "Add Client"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Company Name"
        placeholder="Company or trading name"
        defaultValue={client?.name ?? ""}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.TextField
        id="contactName"
        title="Contact Name"
        placeholder="First name or full name"
        defaultValue={client?.contactName ?? ""}
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="client@example.com"
        defaultValue={client?.email ?? ""}
        error={emailError}
        onChange={() => emailError && setEmailError(undefined)}
      />
      <Form.TextArea
        id="address"
        title="Address"
        placeholder="Street, City, Postcode"
        defaultValue={client?.address ?? ""}
      />
    </Form>
  );
}
