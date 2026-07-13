import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { shortenUrl } from "./api";

interface FormValues {
  longUrl: string;
  domain: string;
  description: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating short link",
      });

      try {
        const result = await shortenUrl({
          longUrl: values.longUrl,
          domain: values.domain,
          description: values.description,
        });

        await Clipboard.copy(result.short_url);
        toast.style = Toast.Style.Success;
        toast.title = "Short link copied";
        toast.message = result.short_url;
        toast.primaryAction = {
          title: "Open Short Link",
          onAction: () => open(result.short_url),
        };
      } catch (error) {
        await showFailureToast(error, { title: "Could not create short link" });
      }
    },
    validation: {
      longUrl: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Copy Short Link"
            icon={Icon.Link}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="https://example.com/article"
        {...itemProps.longUrl}
      />
      <Form.TextField
        title="Short Domain"
        placeholder="Use the default configured domain"
        {...itemProps.domain}
      />
      <Form.TextField
        title="Description"
        placeholder="Optional note for this link"
        {...itemProps.description}
      />
    </Form>
  );
}
