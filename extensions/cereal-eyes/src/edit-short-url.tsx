import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { ShortUrl } from "./types";
import { updateShortUrl } from "./utils/api";

interface FormValues {
  title: string;
  is_active: boolean;
}

interface Props {
  shortUrl: ShortUrl;
  onSuccess?: () => void;
}

export default function EditShortUrl({ shortUrl, onSuccess }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      title: shortUrl.title ?? "",
      is_active: shortUrl.is_active,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving link…",
      });

      try {
        await updateShortUrl(shortUrl.id, {
          title: values.title.trim() || null,
          is_active: values.is_active,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Link updated";
        onSuccess?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update link";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
  });

  return (
    <Form
      navigationTitle="Edit Short URL"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Short URL" text={shortUrl.short_url} />
      <Form.Description title="Destination" text={shortUrl.original_url} />

      <Form.TextField
        {...itemProps.title}
        title="Label"
        placeholder="Campaign homepage (optional)"
      />

      <Form.Checkbox
        {...itemProps.is_active}
        title="Status"
        label="Link is active"
      />
    </Form>
  );
}
