import { useEffect, useState } from "react";
import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { createContact, deleteContact, getAudiences, getContacts, updateContact } from "./utils/api";
import {
  Audience,
  Contact,
  CreateContactRequestForm,
  ErrorResponse,
  GetContactsResponse,
  UpdateContactRequestForm,
} from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function Audiences() {
  const [audience, setAudience] = useState<Audience | undefined>();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState("");

  const { isLoading: isLoadingAudience } = useCachedPromise(() => getAudiences(), [], {
    onData: (data) => {
      if (data && "data" in data) {
        setAudiences(data.data);
      }
    },
    onError: (error) => {
      if (error.name === "validation_error" || error.name === "restricted_api_key") {
        setError(error.message);
      }
    },
  });

  useEffect(() => {
    if (audience) {
      setIsLoadingContacts(true);

      const { id } = audience;
      const contactsData: Promise<ErrorResponse | GetContactsResponse> = getContacts(id);

      contactsData
        .then((response) => {
          if ("statusCode" in response) {
            // The response is an ErrorResponse
            setError(`Error ${response.statusCode}: ${response.message}`);
          } else {
            // The response is a GetContactsResponse
            if (response && "data" in response) {
              setContacts(response.data);
            }
          }
        })
        .catch((error) => {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            // The error is of an unknown type or structure
            setError("An unknown error occurred");
          }
        })
        .finally(() => {
          setIsLoadingContacts(false);
        });
    }
  }, [audience]);

  async function getContactsFromApi(audienceId: string) {
    setIsLoadingContacts(true);

    const response = await getContacts(audienceId);
    if (!("statusCode" in response)) {
      setContacts(response.data);
    } else if (response.name === "validation_error" || response.name === "restricted_api_key") {
      setError(response.message);
    }

    setIsLoadingContacts(false);
  }

  async function confirmAndDelete(audienceId: string, contact: Contact) {
    if (
      await confirmAlert({
        title: `Delete '${contact.email}'?`,
        message: `id: ${contact.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteContact(audienceId, contact.id);
      if (!("statusCode" in response)) {
        await showToast(Toast.Style.Success, "Deleted Domain");
        await getContactsFromApi(audienceId);
      }
    }
  }

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List
      isLoading={isLoadingAudience || isLoadingContacts}
      searchBarAccessory={<AudienceDropdown audiences={audiences} setAudience={setAudience} />}
      actions={
        <ActionPanel>
          {audience && (
            <Action.Push
              title="Create Contact"
              icon={Icon.Plus}
              target={<CreateContact audience={audience} getContactsFromApi={getContactsFromApi} />}
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
                  target={<CreateContact audience={audience} getContactsFromApi={getContactsFromApi} />}
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
                  onAction={() => getContactsFromApi(audience.id)}
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

function CreateContact(props: { audience: Audience; getContactsFromApi: (audienceId: string) => void }) {
  const { audience, getContactsFromApi } = props;

  const { handleSubmit, itemProps } = useForm<CreateContactRequestForm>({
    validation: {
      email: FormValidation.Required,
    },
    async onSubmit(values: CreateContactRequestForm) {
      const contact = await createContact(audience.id, values);
      if (!("statusCode" in contact)) {
        getContactsFromApi(audience.id);
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
