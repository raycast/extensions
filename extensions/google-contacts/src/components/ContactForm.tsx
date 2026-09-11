import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getAccessToken, useForm } from "@raycast/utils";
import { createContact, updateContact } from "../api";
import { buildPersonBody, contactToFormValues, SYSTEM_CONTACT_GROUPS } from "../helpers";
import { useContactGroups } from "../hooks";
import { ContactFormValues, Person } from "../types";

interface ContactFormProps {
  contact?: Person;
  onSaved?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string | undefined): string | undefined {
  if (value && !EMAIL_REGEX.test(value)) {
    return "Invalid email format";
  }
}

export default function ContactForm({ contact, onSaved }: ContactFormProps) {
  const { pop } = useNavigation();
  const { data: groups } = useContactGroups();
  const defaults = contact ? contactToFormValues(contact) : undefined;

  const { handleSubmit, itemProps } = useForm<ContactFormValues>({
    initialValues: {
      firstName: defaults?.firstName ?? "",
      lastName: defaults?.lastName ?? "",
      email: defaults?.email ?? "",
      phone: defaults?.phone ?? "",
      company: defaults?.company ?? "",
      jobTitle: defaults?.jobTitle ?? "",
      notes: defaults?.notes ?? "",
      address: defaults?.address ?? "",
      email2: defaults?.email2 ?? "",
      phone2: defaults?.phone2 ?? "",
      birthday: defaults?.birthday ?? "",
      labels: defaults?.labels ?? [],
    },
    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      email: validateEmail,
      email2: validateEmail,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving contact..." });
      try {
        const { token } = getAccessToken();
        const body = buildPersonBody(values);

        if (contact) {
          // Preserve system group memberships (starred, myContacts) that aren't shown in the form
          const systemMemberships =
            contact.memberships?.filter((m) =>
              m.contactGroupMembership?.contactGroupResourceName
                ? SYSTEM_CONTACT_GROUPS.has(m.contactGroupMembership.contactGroupResourceName)
                : false,
            ) ?? [];
          const mergedMemberships = [...(body.memberships ?? []), ...systemMemberships];
          const mergedBody = { ...body, memberships: mergedMemberships.length > 0 ? mergedMemberships : undefined };

          await updateContact(
            token,
            contact.resourceName,
            { ...mergedBody, etag: contact.etag },
            "names,emailAddresses,phoneNumbers,organizations,addresses,biographies,birthdays,memberships",
          );
        } else {
          await createContact(token, body);
        }

        toast.style = Toast.Style.Success;
        toast.title = contact ? "Contact updated" : "Contact created";
        onSaved?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save contact";
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={contact ? "Update Contact" : "Create Contact"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.firstName} title="First Name" placeholder="John" />
      <Form.TextField {...itemProps.lastName} title="Last Name" placeholder="Doe" />
      <Form.TextField {...itemProps.email} title="Email" placeholder="john@example.com" />
      <Form.TextField {...itemProps.phone} title="Phone" placeholder="+1 234 567 8900" />
      <Form.TextField {...itemProps.company} title="Company" placeholder="Acme Inc" />
      <Form.TextField {...itemProps.jobTitle} title="Job Title" placeholder="Software Engineer" />
      <Form.TextField {...itemProps.address} title="Address" placeholder="123 Main St, City, Country" />
      <Form.TextField {...itemProps.birthday} title="Birthday" placeholder="YYYY-MM-DD or MM-DD" />
      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Notes about this contact" />

      <Form.Separator />

      <Form.TextField {...itemProps.email2} title="Email 2" placeholder="Secondary email" />
      <Form.TextField {...itemProps.phone2} title="Phone 2" placeholder="Secondary phone" />
      <Form.TagPicker {...itemProps.labels} title="Labels">
        {groups?.map((g) => (
          <Form.TagPicker.Item key={g.resourceName} value={g.resourceName} title={g.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
