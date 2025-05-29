import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { importTerms } from "./data-store";

export default function ImportTerms() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { csvContent: string }) {
    setIsLoading(true);
    try {
      const lines = values.csvContent.trim().split("\n");
      const terms = lines.map((line) => {
        const commaIndex = line.indexOf(",");
        if (commaIndex === -1) {
          throw new Error(
            "Invalid CSV format. Each line should have a term and definition separated by a comma.",
          );
        }
        const term = line.slice(0, commaIndex).trim();
        const definition = line
          .slice(commaIndex + 1)
          .trim()
          .replace(/\\n/g, "  \n");
        if (!term || !definition) {
          throw new Error(
            "Invalid CSV format. Each line should have a term and definition separated by a comma.",
          );
        }
        return { term, definition };
      });

      await importTerms(terms);

      await showToast({
        style: Toast.Style.Success,
        title: "Terms imported successfully",
        message: `Imported ${terms.length} terms`,
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to import terms",
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
          <Action.SubmitForm title="Import Terms" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter terms in CSV format. Each line should have a term and definition separated by a comma." />
      <Form.TextArea
        id="csvContent"
        title="CSV Content"
        placeholder="term1, definition1  
term2, definition2"
      />
    </Form>
  );
}
