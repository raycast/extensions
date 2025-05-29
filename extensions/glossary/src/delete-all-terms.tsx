import { ActionPanel, Action, Form, showToast, Toast, Alert, confirmAlert, popToRoot } from "@raycast/api";
import { useState } from "react";
import { getTerms, deleteAllTerms } from "./data-store";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    const terms = await getTerms();
    if (terms.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No terms to delete",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete All Terms",
      message: `Are you sure you want to delete all ${terms.length} terms? This action cannot be undone.`,
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      setIsLoading(true);
      try {
        await deleteAllTerms();
        await showToast({
          style: Toast.Style.Success,
          title: "All terms deleted successfully",
          message: `Deleted ${terms.length} terms`,
        });
        await popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete all terms",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete All Terms" onSubmit={handleSubmit} style={Action.Style.Destructive} />
        </ActionPanel>
      }
    >
      <Form.Description text="Click 'Delete All Terms' to remove all terms from your glossary. This action cannot be undone and will require confirmation." />
    </Form>
  );
}
