import { Toast } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { debridUrl } from "./utils/api";

type Values = {
  url: string;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState("");

  async function handleSubmit(values: Values) {
    try {
      setIsLoading(true);
      const debridedLink = await debridUrl(values.url);
      setIsLoading(false);

      debridedLink.match({
        Ok: (link) => {
          setDownloadLink(link);
          showToast({ title: "Link unlocked !" });
        },
        Error: () => {
          showToast({ title: "Unable to debrid this link", style: Toast.Style.Failure });
        },
      });
    } catch (e) {
      setIsLoading(false);
      showToast({ title: "Something went wrong", style: Toast.Style.Failure });
    }
  }

  const [urlValue, setUrlValue] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && text !== "" && text.includes("https://")) {
        setUrlValue(text);
      }
    });
  }, []);

  return (
    <>
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            {downloadLink !== "" ? <Action.OpenInBrowser url={downloadLink} /> : null}
            <Action.SubmitForm onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="Save this URL"
          placeholder="URL"
          value={urlValue}
          onChange={(value) => setUrlValue(value)}
        />
      </Form>
    </>
  );
}
