import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { addHttps } from "./utils/addHttps";
import { checkUrl } from "./utils/checkUrl";

type UrlInputValues = { url: string };

type UrlInputProps = {
  onSubmit: (url: string) => void;
};

export function UrlInput({ onSubmit }: UrlInputProps) {
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

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
        placeholder="google.com"
        error={urlError}
        onChange={() => {
          setUrlError(undefined);
        }}
      />
    </Form>
  );
}
