import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import carriers from "../carriers";
import { FormValidation, useForm } from "@raycast/utils";
import { Delivery } from "../delivery";
import { randomUUID } from "node:crypto";
import { useState } from "react";

interface AddDeliveryForm {
  name: string;
  carrier: string;
  trackingNumber: string;
  manualDeliveryDate?: Date | null;
}

export default function TrackNewDeliveryView({
  deliveries,
  setDeliveries,
  isLoading,
}: {
  deliveries?: Delivery[];
  setDeliveries: (value: Delivery[]) => Promise<void>;
  isLoading: boolean;
}) {
  const { pop } = useNavigation();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const { handleSubmit, itemProps } = useForm<AddDeliveryForm>({
    onSubmit: async (deliveryForm) => {
      try {
        const delivery: Delivery = {
          id: randomUUID().toString(),
          name: deliveryForm.name,
          trackingNumber: deliveryForm.trackingNumber,
          carrier: deliveryForm.carrier,
          manualDeliveryDate: deliveryForm.manualDeliveryDate ?? undefined,
        };
        await setDeliveries((deliveries || []).concat(delivery));

        await showToast({
          style: Toast.Style.Success,
          title: "New Delivery Added",
          message: deliveryForm.name,
        });

        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Add Delivery",
          message: String(error),
        });
      }
    },
    validation: {
      name: FormValidation.Required,
      carrier: FormValidation.Required,
      trackingNumber: FormValidation.Required,
      manualDeliveryDate: undefined,
    },
  });

  const handleCarrierChange = async (carrierId: string) => {
    const carrier = carriers.get(carrierId);

    const shouldShowDatePicker = carrier === undefined ? true : !(await carrier.ableToTrackRemotely());
    setShowDatePicker(shouldShowDatePicker);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Fill in the details of the delivery you want to track." />
      <Form.TextField title="Name" placeholder="Name for the delivery" {...itemProps.name} />
      <Form.Dropdown title="Carrier" {...itemProps.carrier} onChange={handleCarrierChange}>
        {Array.from(carriers.values()).map((carrier) => (
          <Form.Dropdown.Item key={carrier.id} value={carrier.id} title={carrier.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Tracking number"
        placeholder="Tracking number from the carrier"
        {...itemProps.trackingNumber}
      />
      {showDatePicker && (
        <Form.DatePicker
          title="Manual delivery date"
          info="This carrier doesn't support updating the tracking over the Internet yet.  Set a delivery date manually."
          type={Form.DatePicker.Type.Date}
          {...itemProps.manualDeliveryDate}
        />
      )}
    </Form>
  );
}
