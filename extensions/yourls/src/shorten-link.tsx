import { Action, ActionPanel, Form, Clipboard, showHUD, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { isValidUrl } from "./helper";
import { createShortUrl } from "./api";
import { sanitizeUrl } from "@braintree/sanitize-url";
import { useForm } from "@raycast/utils";

type TValues = {
  url: string;
  title: string;
  keyword: string;
};

export default function ShortLink() {
  const { itemProps, handleSubmit } = useForm<TValues>({
    async onSubmit(values) {
      const toast = await showToast({
        title: "Creating short URL...",
        style: Toast.Style.Animated,
      });

      try {
        const res = await createShortUrl({
          url: sanitizeUrl(values.url),
          title: values.title,
          keyword: values.keyword.toLowerCase(),
        });

        const shortUrl = res.shorturl;

        await Clipboard.copy(shortUrl);

        toast.style = Toast.Style.Success;
        toast.title = "Short URL created";

        await showHUD(`Copied to clipboard: ${shortUrl}`);

        popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create short URL";

        if (error instanceof Error) {
          toast.message = error.message;
        }
      }
    },
    validation: {
      url(value) {
        if (!value) return "URL is required";
        if (!isValidUrl(value)) return "Invalid URL";
      },
      keyword(value) {
        if (value?.includes(" ")) return "Should not contain space";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Shorten" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://example.com" {...itemProps.url} />
      <Form.TextField title="Title" placeholder="Example" {...itemProps.title} />
      <Form.TextField
        title="Keyword"
        placeholder="example-keyword"
        info="Keyword for custom short URL"
        {...itemProps.keyword}
      />
    </Form>
  );
}
