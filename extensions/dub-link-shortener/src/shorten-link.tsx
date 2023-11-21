import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { useCreateShortLink } from "./utils/api";
import { fetchLink } from "./utils/clipboard";

type Values = {
  url: string;
};

const queryClient = new QueryClient();
export default function ShortenLinkWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShortenLink />
    </QueryClientProvider>
  );
}
function ShortenLink() {
  const [originalLink, setOriginalLink] = useState<string>("");
  const { mutate: createShortLink } = useCreateShortLink();

  async function handleSubmit(values: Values) {
    const url = values.url;
    createShortLink(url, {
      onSuccess: async (shortenedLinkData) => {
        const { domain, key } = shortenedLinkData;
        await Clipboard.copy(`https://${domain}/${key}`);
        showToast({ title: "Shortened link", message: "See logs for submitted values" });
      },
      onError: () =>
        showToast({
          title: "Failed to shorten link",
          message: "See logs for submitted values",
          style: Toast.Style.Failure,
        }),
    });
  }

  // TODO move this into a useQuery call
  useEffect(() => {
    async function getSelectedOrClipboardValue() {
      const selectedOrClipboardValue = await fetchLink();
      setOriginalLink(selectedOrClipboardValue);
    }
    getSelectedOrClipboardValue();
  }, []);

  console.log({ originalLink });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten Link" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Your shortened link will be copied to your clipboard." />
      <Form.TextField
        id="url"
        title="Original URL"
        placeholder="https://dub.co"
        value={originalLink}
        onChange={(newValue) => setOriginalLink(newValue)}
      />
    </Form>
  );
}
