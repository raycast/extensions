import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { MercuryApi } from "./lib/api";

export default function CreateCustomer() {
  return (
    <FeatureGuard feature="customers">
      {(apiKey, accountName) => (
        <CustomerForm apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function CustomerForm({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: {
    name: string;
    email: string;
    address1: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.createCustomer({
        name: values.name.trim(),
        email: values.email.trim(),
        address:
          values.address1 || values.city
            ? {
                name: values.name.trim(),
                address1: values.address1 || "",
                city: values.city || "",
                region: values.region || "",
                postalCode: values.postalCode || "",
                country: values.country || "US",
              }
            : undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Customer created",
        message: values.name,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create customer",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Mercury - ${accountName} - Create Customer`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Customer"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Customer name" />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="customer@example.com"
      />

      <Form.Separator />
      <Form.Description text="Address (optional)" />
      <Form.TextField id="address1" title="Street" placeholder="123 Main St" />
      <Form.TextField id="city" title="City" placeholder="San Francisco" />
      <Form.TextField id="region" title="Region" placeholder="CA" />
      <Form.TextField id="postalCode" title="Postal Code" placeholder="94105" />
      <Form.TextField
        id="country"
        title="Country"
        placeholder="US"
        defaultValue="US"
      />
    </Form>
  );
}