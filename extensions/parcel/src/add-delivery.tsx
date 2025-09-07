import { Action, ActionPanel, closeMainWindow, Form, Icon, open, PopToRootType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

interface FormValues {
  trackingNumber: string;
  description: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.trackingNumber.trim()) {
      await showFailureToast({
        title: "Tracking Number Required",
        message: "Please enter a tracking number",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Trim whitespace from tracking number
      const trackingNumber = values.trackingNumber.trim();
      const description = values.description.trim();

      // Choose the appropriate protocol based on whether a description is provided
      let url = "";
      if (description) {
        // Use labeled protocol when description is provided
        url = `parcel://automaticwithlabel/${encodeURIComponent(description)}/?${encodeURIComponent(trackingNumber)}`;
      } else {
        // Use automatic protocol when no description is provided
        url = `parcel://automatic/?${encodeURIComponent(trackingNumber)}`;
      }

      // Open the URL with the appropriate protocol
      await open(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Delivery Added",
        message: description || trackingNumber,
      });

      // Always close the window after adding a package
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      console.error("Error adding delivery:", error);
      await showFailureToast({
        title: "Failed to Add Delivery",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Delivery" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="trackingNumber" title="Tracking Number" placeholder="Enter the tracking number" autoFocus />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter a description for this package (optional)"
      />
    </Form>
  );
}
