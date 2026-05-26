import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import {
  createAppleContact,
  updateAppleContact,
  ContactFormValues,
} from "../apple-contacts";
import { UnifiedContact } from "../types";

interface ContactFormProps {
  contact?: UnifiedContact;
  onSaved: () => void;
}

export default function ContactForm({ contact, onSaved }: ContactFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!contact;

  const extraPhones = (contact?.phones.length ?? 0) > 1;
  const extraEmails = (contact?.emails.length ?? 0) > 1;
  const hasMultipleValues = extraPhones || extraEmails;

  const { handleSubmit, itemProps } = useForm<ContactFormValues>({
    async onSubmit(values) {
      if (!values.firstName.trim() && !values.lastName.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Name required",
          message: "Please enter at least a first or last name.",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEditing ? "Saving contact…" : "Creating contact…",
      });

      try {
        if (isEditing) {
          const appleId = contact.id.replace("apple:", "");
          await updateAppleContact(appleId, values);
        } else {
          await createAppleContact(values);
        }
        toast.style = Toast.Style.Success;
        toast.title = isEditing ? "Contact updated" : "Contact created";
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = isEditing
          ? "Failed to update contact"
          : "Failed to create contact";
        toast.message = String(error);
      }
    },
    initialValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      company: contact?.company ?? "",
      jobTitle: contact?.jobTitle ?? "",
      phone: contact?.phones[0]?.value ?? "",
      email: contact?.emails[0]?.value ?? "",
      notes: contact?.notes ?? "",
    },
  });

  return (
    <Form
      navigationTitle={
        isEditing ? `Edit ${contact?.displayName ?? "Contact"}` : "New Contact"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Contact" : "Create Contact"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {isEditing && hasMultipleValues && (
        <Form.Description
          title="⚠️ Multiple values"
          text={[
            extraPhones &&
              `This contact has ${contact!.phones.length} phone numbers — only the first is shown below.`,
            extraEmails &&
              `This contact has ${contact!.emails.length} email addresses — only the first is shown below.`,
            "Saving will keep only the values entered here. Edit additional entries in the Contacts app.",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}
      <Form.TextField
        title="First Name"
        placeholder="First"
        {...itemProps.firstName}
      />
      <Form.TextField
        title="Last Name"
        placeholder="Last"
        {...itemProps.lastName}
      />
      <Form.Separator />
      <Form.TextField
        title="Company"
        placeholder="Acme Corp"
        {...itemProps.company}
      />
      <Form.TextField
        title="Job Title"
        placeholder="Engineer"
        {...itemProps.jobTitle}
      />
      <Form.Separator />
      <Form.TextField
        title="Phone"
        placeholder="+1 (555) 000-0000"
        {...itemProps.phone}
      />
      <Form.TextField
        title="Email"
        placeholder="name@example.com"
        {...itemProps.email}
      />
      <Form.Separator />
      <Form.TextArea title="Notes" placeholder="Notes…" {...itemProps.notes} />
    </Form>
  );
}
