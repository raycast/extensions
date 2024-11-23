import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useTranslation } from "./hooks/useTranslation";
import { createLink } from "./utils/api";
import { LinkDetail } from "./components/LinkDetail";
import { CreateLinkResponse } from "./types";
import { useLinks } from "./hooks/useLinks";
import { validUrl } from "./utils/url";

interface FormValues {
  url: string;
  slug: string;
  comment?: string;
}

export default function CreateLinkView() {
  const { t } = useTranslation();
  const { push } = useNavigation();
  const { refreshLinks } = useLinks();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      url: (value) => {
        if (!value) return t.urlRequired;
        if (!validUrl(value)) return t.invalidUrl;
      },
      slug: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast({ title: t.linkCreating, style: Toast.Style.Animated });
      try {
        const newLink = (await createLink(values.url, values.slug, values.comment)) as CreateLinkResponse;

        if (newLink && newLink.link) {
          toast.style = Toast.Style.Success;
          toast.title = t.linkCreated;
          toast.message = newLink?.link?.slug || values.slug;
          push(<LinkDetail link={newLink.link} onRefresh={refreshLinks} />);
          refreshLinks();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = t.linkCreationFailed;
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.createShortLink} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title={t.url} placeholder={t.enterUrl} />
      <Form.TextField {...itemProps.slug} title={t.slug} placeholder={t.enterNewLinkSlug} />
      <Form.TextField {...itemProps.comment} title={t.comment} placeholder={t.enterComment} />
    </Form>
  );
}
