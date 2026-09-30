import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { StartupDetailView } from "./components/startup-detail";

type FormValues = {
  slug: string;
};

export default function Command() {
  const [slug, setSlug] = useState<string>("");

  if (slug) {
    return <StartupDetailView slug={slug} onReset={() => setSlug("")} />;
  }

  return (
    <Form
      navigationTitle="Get Startup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Fetch Startup"
            icon={Icon.MagnifyingGlass}
            onSubmit={async (values: FormValues) => {
              const nextSlug = values.slug.trim();

              if (!nextSlug) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Slug is required",
                  message: "Enter a startup slug like 'datafast'",
                });
                return;
              }

              setSlug(nextSlug);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the startup slug from the list command (example: 'datafast')." />
      <Form.TextField id="slug" title="Startup Slug" placeholder="datafast" autoFocus />
    </Form>
  );
}
