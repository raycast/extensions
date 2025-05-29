import { ActionPanel, Action, Form, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";
import { getTerms } from "./data-store";

export default function ExportTerms() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const terms = await getTerms();
      const csvContent = terms
        .map((term) => `${term.term},${term.definition.replace(/ {2}\n/g, "\n").replace(/\n/g, "\\n")}`)
        .join("\n");

      await Clipboard.copy(csvContent);
      await showToast({
        style: Toast.Style.Success,
        title: "Terms exported successfully",
        message: `Copied ${terms.length} terms to clipboard`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export terms",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Terms" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Click 'Export Terms' to copy all terms to your clipboard in CSV format. Each line will contain a term and a definition separated by a comma." />
    </Form>
  );
}
