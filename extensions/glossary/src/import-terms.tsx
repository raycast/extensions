import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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

      const importedTerms = await importTerms(terms);

      // Count how many were new vs updated
      const newTermsCount = importedTerms.filter(
        (term) => term.createdAt === term.updatedAt,
      ).length;
      const updatedTermsCount = importedTerms.length - newTermsCount;

      let message = `Imported ${importedTerms.length} terms`;
      if (newTermsCount > 0 && updatedTermsCount > 0) {
        message = `Added ${newTermsCount} new terms and updated ${updatedTermsCount} existing terms`;
      } else if (newTermsCount > 0) {
        message = `Added ${newTermsCount} new terms`;
      } else if (updatedTermsCount > 0) {
        message = `Updated ${updatedTermsCount} existing terms`;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Terms imported successfully",
        message: message,
      });

      popToRoot();
    } catch (error) {
      showFailureToast(error, { title: "Failed to import terms" });
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
      <Form.Description text="Enter terms in CSV format: one term and definition per line, separated by a comma. Matching terms will be updated" />
      <Form.TextArea
        id="csvContent"
        title="CSV Content"
        placeholder="term1, definition1  
term2, definition2"
      />
    </Form>
  );
}
