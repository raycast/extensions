import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { isApiError } from "./utils/api";
import { CreateContactRequestForm, UpdateContactRequestForm } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { onError, useContacts, useSegments } from "./lib/hooks";
import { Segment, Contact } from "resend";
import { getResend, withResend } from "./lib/oauth";

export default withResend(Segments);
function Segments() {
  const [segment, setSegment] = useState<Segment | undefined>();

  const { isLoading: isLoadingSegments, segments, error: errorSegments } = useSegments();
  const {
    isLoading: isLoadingContacts,
    contacts,
    error: errorContacts,
    mutate: mutateContacts,
  } = useContacts(segment?.id);

  async function confirmAndRemove(segmentId: string, contact: Contact) {
    if (
      await confirmAlert({
        title: `Remove '${contact.email}' From Segment?`,
        message: `id: ${contact.id}`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Removing Contact From Segment", contact.id);
      try {
        const resend = getResend();

        await mutateContacts(
          resend.contacts.segments.remove({ segmentId, contactId: contact.id }).then(({ error }) => {
            if (error) throw new Error(error.message, { cause: error.name });
          }),
          {
            optimisticUpdate(data) {
              return data.filter((c) => c.id !== contact.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Removed Contact From Segment";
      } catch (error) {
        onError(error as Error);
      }
    }
  }

  async function confirmAndDelete(contact: Contact) {
    const confirmed = await confirmAlert({
      title: `Delete '${contact.email}'?`,
      message: "This permanently deletes the contact from your Resend account and all segments. This cannot be undone.",
      primaryAction: { title: "Delete Contact", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast(Toast.Style.Animated, "Deleting Contact", contact.email);
    try {
      await mutateContacts(
        getResend()
          .contacts.remove({ id: contact.id })
          .then(({ error }) => {
            if (error) throw new Error(error.message, { cause: error.name });
          }),
        {
          optimisticUpdate(data) {
            return data.filter((c) => c.id !== contact.id);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted Contact";
    } catch (error) {
      await onError(error as Error);
    }
  }

  const error = errorSegments || errorContacts;
  return error && isApiError(error) ? (
    <ErrorComponent error={error} />
  ) : (
    <List
      isLoading={isLoadingSegments || isLoadingContacts}
      searchBarAccessory={<SegmentDropdown segments={segments} setSegment={setSegment} />}
      actions={
        <ActionPanel>
          {segment && (
            <Action.Push
              title="Create Contact"
              icon={Icon.Plus}
              target={<CreateContact segment={segment} onCreated={mutateContacts} />}
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
              {segment && (
                <Action.Push
                  title="Create Contact"
                  icon={Icon.Plus}
                  target={<CreateContact segment={segment} onCreated={mutateContacts} />}
                />
              )}
              {segment && (
                <Action.Push
                  title="Edit Contact"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<UpdateContact contact={contact} onUpdated={mutateContacts} />}
                />
              )}
              {segment && (
                <Action
                  title="Remove From Segment"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    await confirmAndRemove(segment.id, contact);
                  }}
                />
              )}
              {segment && (
                <Action
                  title="Refresh Contacts"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={mutateContacts}
                />
              )}
              <ActionPanel.Section>
                <Action
                  title="Delete Contact"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(contact)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function SegmentDropdown(props: { segments: Segment[]; setSegment: (segment: Segment) => void }) {
  const { segments, setSegment } = props;

  const onSegmentChange = (newValue: string) => {
    const selectedSegment = segments.find((segment) => segment.id === newValue);
    if (selectedSegment) {
      setSegment(selectedSegment);
    }
  };

  return (
    <List.Dropdown
      tooltip="Select Segment"
      storeValue={true}
      onChange={(newValue) => {
        onSegmentChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Segments">
        {segments.map((segment) => (
          <List.Dropdown.Item key={segment.id} value={segment.id} title={segment.name} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function CreateContact({ segment, onCreated }: { segment: Segment; onCreated: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateContactRequestForm>({
    validation: {
      email: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Contact", values.email);
      try {
        const resend = getResend();
        const { error } = await resend.contacts.create({ ...values, segments: [{ id: segment.id }] });
        if (error) throw new Error(error.message, { cause: error.name });
        toast.style = Toast.Style.Success;
        toast.title = "Created Contact";
        onCreated();
        pop();
      } catch (error) {
        onError(error as Error);
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
      <Form.TextField title="First Name" {...itemProps.firstName} placeholder="John" />
      <Form.TextField title="Last Name" {...itemProps.lastName} placeholder="Doe" />
      <Form.Checkbox label="Unsubscribed" {...itemProps.unsubscribed} />
    </Form>
  );
}

function UpdateContact(props: { contact: Contact; onUpdated: () => void }) {
  const { pop } = useNavigation();
  const { contact, onUpdated } = props;

  const { itemProps, handleSubmit } = useForm<
    UpdateContactRequestForm & {
      firstName: string | undefined;
      lastName: string | undefined;
    }
  >({
    initialValues: {
      firstName: contact.first_name || undefined,
      lastName: contact.last_name || undefined,
      unsubscribed: contact.unsubscribed,
    },
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating Contact", contact.email);
      try {
        const resend = getResend();
        const { error } = await resend.contacts.update({ ...values, id: contact.id });
        if (error) throw new Error(error.message, { cause: error.name });
        toast.style = Toast.Style.Success;
        toast.title = "Updated Contact";
        onUpdated();
        pop();
      } catch (error) {
        onError(error as Error);
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
      <Form.Description title="Email" text={contact.email} />
      <Form.TextField title="First Name" {...itemProps.firstName} placeholder="John" />
      <Form.TextField title="Last Name" {...itemProps.lastName} placeholder="Doe" />
      <Form.Checkbox label="Unsubscribed" {...itemProps.unsubscribed} />
    </Form>
  );
}
