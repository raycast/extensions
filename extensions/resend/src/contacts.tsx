import { useState } from "react";
import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createContact, isApiError, updateContact } from "./utils/api";
import {
  CreateContactRequestForm,
  UpdateContactRequestForm,
} from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { onError, useAudiences, useContacts } from "./lib/hooks";
import { Audience, Contact } from "resend";
import { resend } from "./lib/resend";

export default function Audiences() {
  const [audience, setAudience] = useState<Audience | undefined>();
  
  const { isLoading: isLoadingAudience, audiences, error: errorAudiences } = useAudiences();
  const { isLoading: isLoadingContacts, contacts, error: errorContacts, mutate: mutateContacts } = useContacts(audience?.id);

  async function confirmAndDelete(audienceId: string, contact: Contact) {
    if (
      await confirmAlert({
        title: `Delete '${contact.email}'?`,
        message: `id: ${contact.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting Contact", contact.id);
                  try {
                    await mutateContacts(
                      resend.contacts.remove({audienceId, id: contact.id}).then(({error}) => {
                        if (error) throw new Error(error.message, {cause: error.name});
                      }), {
                        optimisticUpdate(data) {
                          return data.filter(c => c.id!==contact.id)
                        },
                        shouldRevalidateAfter: false
                      }
                    )
                    toast.style = Toast.Style.Success;
                    toast.title = "Deleted Contact";
                  } catch (error) {
                    onError(error as Error);
                  }
                  }
  }

  const error = errorAudiences || errorContacts;
  return error && isApiError(error) ? (
    <ErrorComponent error={error} />
  ) : (
    <List
      isLoading={isLoadingAudience || isLoadingContacts}
      searchBarAccessory={<AudienceDropdown audiences={audiences as Audience[]} setAudience={setAudience} />}
      actions={
        <ActionPanel>
          {audience && (
            <Action.Push
              title="Create Contact"
              icon={Icon.Plus}
              target={<CreateContact audience={audience} getContactsFromApi={mutateContacts} />}
            />
          )}
        </ActionPanel>
      }
    >
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          title={contact.email}
          subtitle={`${contact.first_name || ""}${contact.first_name && contact.last_name ? " " : ""}${
            contact.last_name || ""
          }`}
          icon={
            contact.unsubscribed
              ? { source: Icon.Circle, tintColor: Color.Red }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          actions={
            <ActionPanel>
              {audience && (
                <Action.Push
                  title="Create Contact"
                  icon={Icon.Plus}
                  target={<CreateContact audience={audience} getContactsFromApi={mutateContacts} />}
                />
              )}
              {audience && (
                <Action.Push
                  title="Edit Contact"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<UpdateContact contact={contact} audience={audience} />}
                />
              )}
              {audience && (
                <Action
                  title="Delete Contact"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    await confirmAndDelete(audience.id, contact);
                  }}
                />
              )}
              {audience && (
                <Action
                  title="Refresh Contacts"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={mutateContacts}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function AudienceDropdown(props: { audiences: Audience[]; setAudience: (audience: Audience) => void }) {
  const { audiences, setAudience } = props;

  const onAudienceChange = (newValue: string) => {
    const selectedAudience = audiences.find((audience) => audience.id === newValue);
    if (selectedAudience) {
      setAudience(selectedAudience);
    }
  };

  return (
    <List.Dropdown
      tooltip="Select Audience"
      storeValue={true}
      onChange={(newValue) => {
        onAudienceChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Audiences">
        {audiences.map((audience) => (
          <List.Dropdown.Item key={audience.id} value={audience.id} title={audience.name} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function CreateContact(props: { audience: Audience; getContactsFromApi: () => void }) {
  const { audience, getContactsFromApi } = props;

  const { handleSubmit, itemProps } = useForm<CreateContactRequestForm>({
    validation: {
      email: FormValidation.Required,
    },
    async onSubmit(values: CreateContactRequestForm) {
      const contact = await createContact(audience.id, values);
      if (!("statusCode" in contact)) {
        getContactsFromApi();
        showToast(Toast.Style.Success, "Created Contact", contact.email);
      } else {
        showToast(Toast.Style.Failure, "Error", contact.message);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" {...itemProps.email} placeholder="john.doe@example.com" />
      <Form.TextField title="First Name" {...itemProps.first_name} placeholder="John" />
      <Form.TextField title="Last Name" {...itemProps.last_name} placeholder="Doe" />
      <Form.Checkbox label="Unsubscribed" {...itemProps.unsubscribed} />
    </Form>
  );
}

function UpdateContact(props: { contact: Contact; audience: Audience }) {
  const { contact, audience } = props;

  const { itemProps, handleSubmit } = useForm<UpdateContactRequestForm>({
    initialValues: {
      email: contact.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      unsubscribed: contact.unsubscribed,
    },
    validation: {
      email: FormValidation.Required,
    },
    async onSubmit(values: UpdateContactRequestForm) {
      const response = await updateContact(audience.id, contact.id, values);
      if (!("statusCode" in response)) {
        showToast(Toast.Style.Success, "Updated Contact", contact.email);
      } else {
        showToast(Toast.Style.Failure, "Error", response.message);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" {...itemProps.email} placeholder="john.doe@example.com" />
      <Form.TextField title="First Name" {...itemProps.first_name} placeholder="John" />
      <Form.TextField title="Last Name" {...itemProps.last_name} placeholder="Doe" />
      <Form.Checkbox label="Unsubscribed" {...itemProps.unsubscribed} />
    </Form>
  );
}
