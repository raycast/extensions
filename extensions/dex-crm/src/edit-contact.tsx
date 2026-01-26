import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DexAPI } from "./dex-api";
import { DexContact } from "./types";
import { getContactDisplayName } from "./utils";

interface EditContactFormProps {
  contact: DexContact;
  onContactUpdated: (contact: DexContact) => void;
}

export function EditContactForm({ contact, onContactUpdated }: EditContactFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    description: string;
    website: string;
  }) {
    setIsLoading(true);

    try {
      const api = new DexAPI();

      const emailList = values.email
        ? values.email
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e)
            .map((email) => ({ email }))
        : contact.emails || [];

      const phoneList = values.phone
        ? values.phone
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p)
            .map((phone_number) => ({ phone_number }))
        : contact.phones || [];

      const updatedContact = await api.updateContact({
        id: contact.id,
        first_name: values.firstName || null,
        last_name: values.lastName || null,
        emails: emailList,
        phones: phoneList,
        job_title: values.jobTitle || null,
        description: values.description || null,
        website: values.website || null,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Contact updated",
        message: `${getContactDisplayName(updatedContact)} has been updated`,
      });

      onContactUpdated(updatedContact);
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update contact",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${getContactDisplayName(contact)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Contact" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="firstName" title="First Name" placeholder="John" defaultValue={contact.first_name || ""} />
      <Form.TextField id="lastName" title="Last Name" placeholder="Doe" defaultValue={contact.last_name || ""} />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="john@example.com (separate multiple with commas)"
        defaultValue={contact.emails?.map((e) => e.email).join(", ") || ""}
      />
      <Form.TextField
        id="phone"
        title="Phone"
        placeholder="+1234567890 (separate multiple with commas)"
        defaultValue={contact.phones?.map((p) => p.phone_number).join(", ") || ""}
      />
      <Form.Separator />
      <Form.TextField
        id="jobTitle"
        title="Job Title"
        placeholder="Software Engineer"
        defaultValue={contact.job_title || ""}
      />
      <Form.TextField
        id="website"
        title="Website"
        placeholder="https://example.com"
        defaultValue={contact.website || ""}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Additional information about this contact"
        defaultValue={contact.description || ""}
      />
    </Form>
  );
}
