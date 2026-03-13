import { closeMainWindow, open, Action, ActionPanel, Form, Icon, LaunchProps, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { checkDropshareInstallation, isDropshareInstalled } from "./utils/check";
import { getUrlFromClipboard } from "./utils/clipboard";

const queryClient = new QueryClient();
export default function ShortenLinkWrapper(props: LaunchProps<{ arguments: { url: string; key?: string } }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShortenLink arguments={props.arguments} launchType={LaunchType.UserInitiated} />
    </QueryClientProvider>
  );
}
function ShortenLink(props: LaunchProps<{ arguments: { url?: string } }>) {
  const { url: argumentUrl } = props.arguments;
  const [originalLink, setOriginalLink] = useState<string>(argumentUrl ?? "");

  async function shorten() {
    checkDropshareInstallation();

    if ((await isDropshareInstalled()) === true) {
      if (typeof argumentUrl != "undefined" && originalLink.length > 0) {
        console.log("Shortening URL: " + originalLink);
        const url = "dropshare5:///action/shorten-url?url=" + encodeURI(originalLink.trim());
        open(url);
        await closeMainWindow();
      } else {
        console.error("No URL was provided.");
      }
    } else {
      console.error("Dropshare is not installed.");
    }
  }

  useEffect(() => {
    async function checkClipboardForUrl() {
      const selectedOrClipboardValue = await getUrlFromClipboard();
      setOriginalLink(selectedOrClipboardValue);
    }
    if (argumentUrl == null || argumentUrl == "" || argumentUrl.length == 0) {
      checkClipboardForUrl();
    }
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten URL" icon={Icon.Link} onSubmit={shorten} />
        </ActionPanel>
      }
    >
      <Form.Description text="The shortened URL will be copied to your clipboard by Dropshare." />
      <Form.TextField
        id="url"
        title="Long URL"
        placeholder="https://dropshare.app"
        value={originalLink}
        onChange={(newValue) => setOriginalLink(newValue)}
      />
    </Form>
  );
}
