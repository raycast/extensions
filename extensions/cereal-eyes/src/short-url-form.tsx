import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createShortUrl } from "./utils/api";

interface FormValues {
  original_url: string;
  title: string;
  custom_code: string;
  expires_at: Date | null;
}

interface Props {
  onSuccess?: () => void;
}

export default function ShortUrlForm({ onSuccess }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: {
      original_url: "",
      title: "",
      custom_code: "",
      expires_at: null,
    },
    validation: {
      original_url: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating short URL…",
      });

      try {
        const response = await createShortUrl({
          original_url: values.original_url.trim(),
          title: values.title.trim() || undefined,
          custom_code: values.custom_code.trim() || undefined,
          expires_at: values.expires_at?.toISOString(),
        });

        await Clipboard.copy(response.data.short_url);

        toast.style = Toast.Style.Success;
        toast.title = "Short URL created";
        toast.message = response.data.short_url;
        toast.primaryAction = {
          title: "Create Another",
          onAction: () => {
            reset();
            toast.hide();
          },
        };

        onSuccess?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create short URL";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
  });

  return (
    <Form
      navigationTitle="Create Short URL"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.original_url}
        title="Destination URL"
        placeholder="https://example.com/very/long/path"
      />

      <Form.TextField
        {...itemProps.title}
        title="Label"
        placeholder="Campaign homepage (optional)"
      />

      <Form.TextField
        {...itemProps.custom_code}
        title="Custom Code"
        placeholder="my-campaign"
        info="Optional. Custom codes require a Pro plan."
      />

      <Form.DatePicker
        {...itemProps.expires_at}
        title="Expires At"
        type={Form.DatePicker.Type.DateTime}
        info="Optional. Expiration requires a Pro plan."
      />
    </Form>
  );
}
