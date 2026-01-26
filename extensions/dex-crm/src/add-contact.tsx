import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { DexAPI } from "./dex-api";
import { getContactDisplayName } from "./utils";

export default function AddContact() {
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
    if (!values.firstName && !values.lastName && !values.email) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please provide at least a name or email",
      });
      return;
    }

    setIsLoading(true);

    try {
      const api = new DexAPI();

      const emailList = values.email
        ? values.email
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e)
            .map((email) => ({ email }))
        : [];

      const phoneList = values.phone
        ? values.phone
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p)
            .map((phone_number) => ({ phone_number }))
        : [];

      const newContact = await api.createContact({
        first_name: values.firstName || null,
        last_name: values.lastName || null,
        emails: emailList.length > 0 ? emailList : [],
        phones: phoneList.length > 0 ? phoneList : [],
        job_title: values.jobTitle || null,
        description: values.description || null,
        website: values.website || null,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Contact created",
        message: `${getContactDisplayName(newContact)} has been added to Dex`,
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create contact",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add New Contact"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Contact" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="firstName"
        title="First Name"
        placeholder="John"
        info="At least one of: First Name, Last Name, or Email is required"
      />
      <Form.TextField id="lastName" title="Last Name" placeholder="Doe" />
      <Form.TextField id="email" title="Email" placeholder="john@example.com (separate multiple with commas)" />
      <Form.TextField id="phone" title="Phone" placeholder="+1234567890 (separate multiple with commas)" />
      <Form.Separator />
      <Form.TextField id="jobTitle" title="Job Title" placeholder="Software Engineer" />
      <Form.TextField id="website" title="Website" placeholder="https://example.com" />
      <Form.TextArea id="description" title="Description" placeholder="Additional information about this contact" />
    </Form>
  );
}
