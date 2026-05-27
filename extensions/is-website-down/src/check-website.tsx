import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

import { WebsiteStatusDetail } from "./components/WebsiteStatusDetail";

interface FormValues {
  url: string;
}

export default function Command() {
  const [websiteUrl, setWebsiteUrl] = useState<string>();

  if (websiteUrl) {
    return (
      <WebsiteStatusDetail
        input={websiteUrl}
        onReset={() => setWebsiteUrl(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="Check Website"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Check Website"
            onSubmit={(values: FormValues) => {
              const nextUrl = values.url.trim();

              if (!nextUrl) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a website URL",
                });
                return;
              }

              setWebsiteUrl(nextUrl);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Website URL"
        placeholder="example.com"
        autoFocus
      />
    </Form>
  );
}
