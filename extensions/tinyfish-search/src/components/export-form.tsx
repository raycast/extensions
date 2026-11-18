import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { exportMarkdown } from "../export-markdown";

export function ExportForm({ title, markdown }: { title: string; markdown: string }) {
  const [destination, setDestination] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<{ directory: string[]; name: string }>({
    initialValues: { directory: [], name: title },
    validation: { directory: (value) => (value?.length ? undefined : "Choose an export folder.") },
    async onSubmit(values) {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const file = await exportMarkdown(values.directory[0], values.name, markdown);
        setDestination(file);
        await showToast({ style: Toast.Style.Success, title: "Markdown exported" });
      } catch (error) {
        await showFailureToast(error, { title: "Could not export Markdown" });
      } finally {
        setIsLoading(false);
      }
    },
  });
  return (
    <Form
      navigationTitle="Export Markdown"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {destination ? <Action.ShowInFinder path={destination} /> : null}
          <Action.SubmitForm title="Export Markdown" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="File Name" {...itemProps.name} />
      <Form.FilePicker
        title="Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        {...itemProps.directory}
      />
      {destination ? <Form.Description title="Exported" text={destination} /> : null}
    </Form>
  );
}
