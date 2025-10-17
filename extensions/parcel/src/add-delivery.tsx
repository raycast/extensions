import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast, useForm, FormValidation } from "@raycast/utils";
import { useCarriers } from "./hooks/useCarriers";
import { addDelivery, getUserLanguage } from "./api";

interface FormValues {
  trackingNumber: string;
  carrierCode: string;
  description: string;
}

export default function Command() {
  const { carriers, isLoading: carriersLoading } = useCarriers();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
        // Trim whitespace from inputs
        const trackingNumber = values.trackingNumber.trim();
        const description = values.description.trim();
        const language = getUserLanguage();

        // Use the API to add delivery
        await addDelivery(trackingNumber, values.carrierCode, description, language);

        // Show a success HUD
        await showHUD(`📦 Delivery Added`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        console.error("Error adding delivery:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showFailureToast({
          title: "Failed to Add Delivery",
          message: errorMessage,
        });
      }
    },
    validation: {
      trackingNumber: FormValidation.Required,
      carrierCode: FormValidation.Required,
      description: FormValidation.Required,
    },
  });

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
    </Form>
  );
}
