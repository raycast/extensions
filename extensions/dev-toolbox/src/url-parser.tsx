import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function UrlParser() {
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<URL | null>(null);

  const parseUrl = () => {
    try {
      const parsedUrl = new URL(url);
      setParsed(parsedUrl);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      setParsed(null);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse URL" onSubmit={parseUrl} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL to parse" value={url} onChange={setUrl} />

      {parsed && (
        <>
          <Form.Description text="Parsed Components" />
          <Form.Separator />
          <Form.Description text={`Protocol: ${parsed.protocol}`} />
          <Form.Description text={`Hostname: ${parsed.hostname}`} />
          <Form.Description text={`Pathname: ${parsed.pathname}`} />
          <Form.Description text={`Search Params: ${parsed.searchParams.toString()}`} />
          <Form.Description text={`Hash: ${parsed.hash}`} />
        </>
      )}
    </Form>
  );
}
