import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { addHttps } from "./utils/addHttps";
import { checkUrl } from "./utils/checkUrl";

type UrlInputValues = { url: string };

type UrlInputProps = {
  initialUrl: string;
  onSubmit: (url: string) => void;
};

export function UrlInput({ onSubmit, initialUrl }: UrlInputProps) {
  const [urlError, setUrlError] = useState<string | undefined>("Enter a valid http(s) URL.");
  const [input, setInput] = useState(initialUrl);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async ({ url }: UrlInputValues) => {
              if (!url) {
                setUrlError("Enter a URL");
              }

              url = addHttps(url);
              if (await checkUrl(url)) {
                setUrlError(undefined);
                onSubmit(url);
              } else {
                setUrlError("Enter a valid http(s) URL.");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a URL to view OSINT information (DNS, SSL, etc)." />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="site.com"
        value={input}
        error={urlError}
        onChange={(value) => {
          if (value !== input) setUrlError(undefined);
          setInput(value);
        }}
      />
    </Form>
  );
}
