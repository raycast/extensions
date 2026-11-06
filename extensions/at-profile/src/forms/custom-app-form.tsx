import { showError } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { addCustomApp, updateCustomApp } from "../helpers/apps";
import { validateUrlTemplate } from "../helpers/url";
import { AppEntry } from "../types";

interface CustomAppFormProps {
  app?: AppEntry;
}

export default function CustomAppForm({ app }: CustomAppFormProps) {
  const { pop } = useNavigation();
  const [urlError, setUrlError] = useState<string | undefined>();

  const handleSubmit = async (values: { name: string; url: string }) => {
    const input = { name: values.name, urlTemplate: values.url };
    try {
      if (app) {
        const updated = await updateCustomApp(app.value, input);
        await showToast({ style: Toast.Style.Success, title: "App Updated", message: updated.name });
      } else {
        const added = await addCustomApp(input);
        await showToast({ style: Toast.Style.Success, title: "App Added", message: added.name });
      }
      pop();
    } catch (error) {
      await showError(error, { title: app ? "Couldn't Update App" : "Couldn't Add App" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={app ? "Update App" : "Add App"}
            icon={app ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g., Custom Social Network" defaultValue={app?.name ?? ""} />
      <Form.TextField
        id="url"
        title="URL Template"
        placeholder="https://example.com/{profile}"
        defaultValue={app?.urlTemplate ?? ""}
        error={urlError}
        onChange={(newValue) => setUrlError(newValue.trim() ? validateUrlTemplate(newValue) : undefined)}
      />
      <Form.Description text="Use {profile} as the placeholder for the username." />
    </Form>
  );
}
