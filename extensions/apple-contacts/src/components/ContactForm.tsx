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
import { t } from "../i18n";
import { UnifiedContact } from "../types";

interface ContactFormProps {
  contact?: UnifiedContact;
  onSaved: () => void;
}

export default function ContactForm({ contact, onSaved }: ContactFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!contact;

  const { handleSubmit, itemProps } = useForm<ContactFormValues>({
    async onSubmit(values) {
      if (!values.firstName.trim() && !values.lastName.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: t("toast_name_required"),
          message: t("toast_name_required_message"),
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEditing
          ? t("toast_saving_contact")
          : t("toast_creating_contact"),
      });

      try {
        if (isEditing) {
          const appleId = contact.id.replace("apple:", "");
          await updateAppleContact(appleId, values);
        } else {
          await createAppleContact(values);
        }
        toast.style = Toast.Style.Success;
        toast.title = isEditing
          ? t("toast_contact_updated")
          : t("toast_contact_created");
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = isEditing
          ? t("toast_failed_update_contact")
          : t("toast_failed_create_contact");
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
        isEditing
          ? t("form_title_edit", {
              name: contact?.displayName ?? t("contact_singular"),
            })
          : t("form_title_new")
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              isEditing ? t("action_save_contact") : t("action_create_contact")
            }
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title={t("field_first_name")}
        placeholder={t("placeholder_first_name")}
        {...itemProps.firstName}
      />
      <Form.TextField
        title={t("field_last_name")}
        placeholder={t("placeholder_last_name")}
        {...itemProps.lastName}
      />
      <Form.Separator />
      <Form.TextField
        title={t("field_company")}
        placeholder={t("placeholder_company")}
        {...itemProps.company}
      />
      <Form.TextField
        title={t("field_job_title")}
        placeholder={t("placeholder_job_title")}
        {...itemProps.jobTitle}
      />
      <Form.Separator />
      <Form.TextField
        title={t("field_phone")}
        placeholder={t("placeholder_phone")}
        {...itemProps.phone}
      />
      <Form.TextField
        title={t("field_email")}
        placeholder={t("placeholder_email")}
        {...itemProps.email}
      />
      <Form.Separator />
      <Form.TextArea
        title={t("field_notes")}
        placeholder={t("placeholder_notes")}
        {...itemProps.notes}
      />
    </Form>
  );
}
