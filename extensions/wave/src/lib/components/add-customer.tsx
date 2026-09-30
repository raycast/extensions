import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { common, useGetCountries, useGetCurrencies } from "../wave";
import { API_URL } from "../config";
import { Result } from "../types";
import { MUTATIONS } from "../gql/mutations";
import { useState } from "react";

export default function AddCustomer({ businessId, onCreate }: { businessId: string; onCreate: () => void }) {
  const { pop } = useNavigation();
  const [isCreating, setIsCreating] = useState(false);
  const { isLoading: isLoadingCurrencies, data: currencies } = useGetCurrencies();
  const { isLoading: isLoadingCountries, data: countries } = useGetCountries();

  type FormValues = {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    website: string;
    internalNotes: string;
    currency: string;
    addressLine1: string;
    addressLine2: string;
    countryCode: string;
    shippingName: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
    shippingPhone: string;
    shippingInstructions: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      try {
        setIsCreating(true);
        const response = await fetch(API_URL, {
          ...common(),
          body: JSON.stringify({
            query: MUTATIONS.createCustomer,
            variables: {
              input: {
                businessId,
                name: values.name,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                website: values.website,
                internalNotes: values.internalNotes,
                currency: values.currency || undefined,
                address: {
                  addressLine1: values.addressLine1,
                  addressLine2: values.addressLine2,
                  countryCode: values.countryCode || undefined,
                },
                shippingDetails: {
                  name: values.shippingName,
                  address: {
                    addressLine1: values.shippingAddressLine1,
                    addressLine2: values.shippingAddressLine2,
                  },
                  phone: values.shippingPhone,
                  instructions: values.shippingInstructions,
                },
              },
            },
          }),
        });
        const result = (await response.json()) as Result<{ customerCreate: { didSucceed: boolean } }>;
        if ("errors" in result) throw new Error(result.errors[0].message);
        if (!result.data.customerCreate.didSucceed) throw new Error("Unknown Error");
        onCreate();
        pop();
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsCreating(false);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  const isLoading = isLoadingCountries || isLoadingCurrencies || isCreating;
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Basic information" text="" />
      <Form.TextField title="Customer" info="Name of a business or person." {...itemProps.name} />
      <Form.Description text="This is the only required field" />
      <Form.Separator />

      <Form.Description text="Primary contact" />
      <Form.TextField title="First name" {...itemProps.firstName} />
      <Form.TextField title="Last name" {...itemProps.lastName} />
      <Form.TextField title="Email" {...itemProps.email} />
      <Form.TextField title="Phone" {...itemProps.phone} />
      <Form.Separator />

      <Form.TextField title="Website" {...itemProps.website} />
      <Form.TextArea title="Notes" {...itemProps.internalNotes} />
      <Form.Separator />

      <Form.Description title="Billing" text="" />
      <Form.Dropdown
        title="Currency"
        info="Invoices for this customer will default to this currency."
        {...itemProps.currency}
      >
        <Form.Dropdown.Item title="" value="" />
        {currencies.map((currency) => (
          <Form.Dropdown.Item
            key={currency.code}
            title={`${currency.code} (${currency.symbol}) - ${currency.name})`}
            value={currency.code}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Billing address" />
      <Form.TextField title="Address" {...itemProps.addressLine1} />
      <Form.TextField title="Address 2" {...itemProps.addressLine2} />
      <Form.Dropdown title="Country" {...itemProps.countryCode}>
        <Form.Dropdown.Item title="" value="" />
        {countries.map((country) => (
          <Form.Dropdown.Item key={country.code} title={country.name} value={country.code} />
        ))}
      </Form.Dropdown>
      <Form.Separator />

      <Form.Description title="Shipping" text="" />
      <Form.TextField title="Ship to" info="Name of a business or person." {...itemProps.shippingName} />
      <Form.TextField title="Address" {...itemProps.shippingAddressLine1} />
      <Form.TextField title="Address 2" {...itemProps.shippingAddressLine2} />
      <Form.TextField title="Phone" {...itemProps.shippingPhone} />
      <Form.TextArea title="Delivery instructions" {...itemProps.shippingInstructions} />
    </Form>
  );
}
