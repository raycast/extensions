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
  const [lastShortenedUrl, setLastShortenedUrl] = useState<string>("");
  const { mutate: createShortLink, isLoading } = useCreateShortLink();

  async function handleSubmit(values: Values) {
    const url = values.url;
    createShortLink(url, {
      onSuccess: async (shortenedLinkData) => {
        const { domain, key } = shortenedLinkData;
        const shortenedUrl = `https://${domain}/${key}`;
        await Clipboard.copy(shortenedUrl);
        setLastShortenedUrl(shortenedUrl);
        setOriginalLink("");
        showToast({
          title: "Shortened link and copied to clipboard",
          message: "See logs for submitted values",
        });
      },
      onError: () => {
        setOriginalLink("");
        setLastShortenedUrl("");
        showToast({
          title: "Failed to shorten link",
          message: "See logs for submitted values",
          style: Toast.Style.Failure,
        });
      },
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
      isLoading={isLoading}
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
      {lastShortenedUrl !== "" && originalLink === "" && (
        <>
          <Form.Description text={`Shortened link (copied to clipboard):`} />
          <Form.Description text={`${lastShortenedUrl}`} />
        </>
      )}
    </Form>
  );
}
