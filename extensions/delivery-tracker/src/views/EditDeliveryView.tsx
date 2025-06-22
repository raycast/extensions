import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import carriers from "../carriers";
import { FormValidation, useForm } from "@raycast/utils";
import { Delivery } from "../delivery";
import { PackageMap } from "../package";
import { useState } from "react";

interface EditDeliveryForm {
  name: string;
  carrier: string;
  trackingNumber: string;
  manualDeliveryDate?: Date | null;
}

export default function EditDeliveryView({
  delivery,
  deliveries,
  setDeliveries,
  isLoading,
  setPackages,
}: {
  delivery: Delivery;
  deliveries: Delivery[];
  setDeliveries: (value: Delivery[]) => Promise<void>;
  isLoading: boolean;
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void;
}) {
  const { pop } = useNavigation();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const { handleSubmit, itemProps } = useForm<EditDeliveryForm>({
    onSubmit: async (deliveryForm) => {
      try {
        if (
          delivery.trackingNumber !== deliveryForm.trackingNumber ||
          delivery.carrier !== deliveryForm.carrier ||
          delivery.manualDeliveryDate !== deliveryForm.manualDeliveryDate
        ) {
          // clear packages for this delivery so it will refresh
          setPackages((packages) => {
            delete packages[delivery.id];
            return packages;
          });
        }

        delivery.name = deliveryForm.name;
        delivery.trackingNumber = deliveryForm.trackingNumber;
        delivery.carrier = deliveryForm.carrier;
        delivery.manualDeliveryDate = deliveryForm.manualDeliveryDate ?? undefined;

        await setDeliveries(deliveries);

        await showToast({
          style: Toast.Style.Success,
          title: "Delivery Modified",
          message: deliveryForm.name,
        });

        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Modify Delivery",
          message: String(error),
        });
      }
    },
    initialValues: {
      name: delivery.name,
      carrier: delivery.carrier,
      trackingNumber: delivery.trackingNumber,
      manualDeliveryDate: delivery.manualDeliveryDate,
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

    const shouldShowDatePicker = carrier === undefined ? true : !carrier.ableToTrackRemotely();
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
      <Form.Description text="Edit the details of the delivery." />
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
