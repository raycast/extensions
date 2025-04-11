import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { Link } from "../types";
import { editLink } from "../utils/api";
import { useTranslation } from "../hooks/useTranslation";
import { useForm } from "@raycast/utils";
import { validUrl } from "../utils/url";
interface EditLinkViewProps {
  link: Link;
  onEditSuccess: (updatedLink: Link) => void;
}

interface FormValues {
  url: string;
  comment: string;
}

export function EditLinkView({ link, onEditSuccess }: EditLinkViewProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      url: link.url,
      comment: link.comment || "",
    },
    validation: {
      url: (value) => {
        if (!value) return t.urlRequired;
        if (!validUrl(value)) return t.invalidUrl;
      },
    },
    async onSubmit(values) {
      const toast = await showToast({ title: t.linkUpdating, style: Toast.Style.Animated });
      try {
        const updatedLink = await editLink(link.slug, values.url, values.comment);
        toast.style = Toast.Style.Success;
        toast.title = t.linkUpdated;
        toast.message = link.slug;
        onEditSuccess(updatedLink as Link);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = t.linkUpdateFailed;
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`${t.editLink}: ${link.slug}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title={t.url} placeholder={t.enterUrl} />
      <Form.TextField {...itemProps.comment} title={t.comment} placeholder={t.enterComment} />
    </Form>
  );
}
