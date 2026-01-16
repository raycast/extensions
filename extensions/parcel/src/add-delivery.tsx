import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect } from "react";
import { useCarriers } from "./hooks/useCarriers";
import { addDelivery } from "./api";

interface FormValues {
  trackingNumber: string;
  carrierCode: string;
  description: string;
  confirmationNotification: boolean;
}

export default function Command() {
  const { carriers, isLoading: carriersLoading, error: carriersError } = useCarriers();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
        // Trim whitespace from inputs
        const trackingNumber = values.trackingNumber.trim();
        const description = values.description.trim();
        const confirmationNotification = values.confirmationNotification;

        // Use the API to add delivery
        await addDelivery(trackingNumber, values.carrierCode, description, confirmationNotification);

        // Show a success HUD
        await showHUD(`📦 Delivery Added`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        console.error("Error adding delivery:", error);

        let errorMessage = "Something went wrong";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Error adding delivery",
          message: errorMessage,
        });
      }
    },
    validation: {
      trackingNumber: (value) => {
        if (!value || !value.trim()) {
          return "Tracking number is required";
        }
      },
      carrierCode: FormValidation.Required,
      description: (value) => {
        if (!value || !value.trim()) {
          return "Description is required";
        }
      },
    },
  });

  useEffect(() => {
    if (carriersError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load carriers",
        message: carriersError.message || "Unable to fetch supported carriers. Please try again later.",
      });
    }
  }, [carriersError]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Delivery" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={carriersLoading}
    >
      <Form.TextField
        title="Tracking Number"
        placeholder="Enter the tracking number"
        autoFocus
        {...itemProps.trackingNumber}
      />
      <Form.Dropdown title="Carrier" placeholder="Select a carrier" {...itemProps.carrierCode}>
        {carriers.map((carrier) => (
          <Form.Dropdown.Item key={carrier.code} value={carrier.code} title={carrier.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Description"
        placeholder="Enter a description for this package"
        {...itemProps.description}
      />
      <Form.Checkbox
        title="Confirmation"
        label="Receive a push notification when the delivery is added."
        {...itemProps.confirmationNotification}
      />
    </Form>
  );
}
