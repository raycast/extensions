import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { useCreateShortLink } from "./utils/api";
import { fetchLink } from "./utils/clipboard";

const queryClient = new QueryClient();
export default function ShortenLinkWrapper(props: LaunchProps<{ arguments: { url: string; key?: string } }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShortenLink arguments={props.arguments} launchType={LaunchType.UserInitiated} />
    </QueryClientProvider>
  );
}
function ShortenLink(props: LaunchProps<{ arguments: { url?: string; key?: string } }>) {
  const { url: argumentUrl, key: argumentKey } = props.arguments;
  const [originalLink, setOriginalLink] = useState<string>(argumentUrl ?? "");
  const [urlKey, setUrlKey] = useState<string | undefined>(argumentKey);
  const [lastShortenedUrl, setLastShortenedUrl] = useState<string>("");
  const { mutate: createShortLink, isLoading } = useCreateShortLink();

  async function handleSubmit() {
    /**
     * This uses controlled values for originalLink and urlKey because
     * we want to be able to programmatically set the originalLink
     * on extension load by checking the clipboard value
     *
     */
    createShortLink(
      { originalUrl: originalLink, urlKey },
      {
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
      },
    );
  }

  // TODO move this into a useQuery call
  useEffect(() => {
    async function getSelectedOrClipboardValue() {
      const selectedOrClipboardValue = await fetchLink();
      setOriginalLink(selectedOrClipboardValue);
    }
    if (argumentUrl == null) {
      getSelectedOrClipboardValue();
    }
  }, []);

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
      <Form.TextField
        id="shortUrl"
        title="URL Key"
        placeholder="(Optional)"
        value={urlKey}
        onChange={(urlKey) => setUrlKey(urlKey)}
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
