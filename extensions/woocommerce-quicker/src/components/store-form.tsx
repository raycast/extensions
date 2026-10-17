import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useForm, FormValidation } from "@raycast/utils";
import type { WooStore, StoreFormValues, StoreStatus } from "../types/types";
import { randomUUID } from "crypto";
import { fetchWooCommerce } from "../hooks/useWooCommerce";
import { useState } from "react";
import { decode } from "he";

interface StoreFormProps {
  store?: WooStore;
  action?: "create" | "update";
  submitAction: (store: WooStore) => Promise<void>;
}

export function StoreForm({ store, action = "create", submitAction }: StoreFormProps) {
  const { pop } = useNavigation();
  const [loadingStatus, setLoadingStatus] = useState(false);
  const defaultFormatting = {
    currency: "USD",
    currencySymbol: "$",
    thousandSeparator: ",",
    decimalSeparator: ".",
    numberOfDecimals: 2,
  };

  const responses = {
    create: {
      successTitle: "Store Added",
      successMessage: `New store added successfully.`,
      errorTitle: "Error Adding Store",
      errorMessage: "An error occurred while adding the store. Please try again.",
    },
    update: {
      successTitle: "Store Updated",
      successMessage: `Store updated successfully.`,
      errorTitle: "Error Updating Store",
      errorMessage: "An error occurred while updating the store. Please try again.",
    },
  };

  const { handleSubmit, itemProps } = useForm<StoreFormValues>({
    initialValues: {
      name: store?.name ?? "",
      storeUrl: store?.storeUrl ?? "",
      consumerKey: store?.consumerKey ?? "",
      consumerSecret: store?.consumerSecret ?? "",
      favourite: store?.favourite ?? false,
      local: store?.local ?? false,
    },
    onSubmit: async (values) => {
      setLoadingStatus(true);
      try {
        const submittedForm: WooStore = {
          id: store?.id ?? randomUUID(),
          name: values.name,
          storeUrl: values.storeUrl,
          consumerKey: values.consumerKey,
          consumerSecret: values.consumerSecret,
          favourite: values.favourite,
          local: values.local,
          formatting: store?.formatting || defaultFormatting,
        };

        let storeStatus: StoreStatus | null = null;
        try {
          storeStatus = await fetchWooCommerce<StoreStatus>(submittedForm, "system_status");
        } catch (error) {
          console.error(error);
          await showFailureToast({
            title: "Connection Error",
            message:
              "Unable to connect to the store with the provided credentials. Please check your settings and try again.",
          });
          return;
        }

        if (storeStatus?.settings) {
          submittedForm.formatting = {
            currency: storeStatus.settings.currency ?? submittedForm.formatting.currency,
            currencySymbol: decode(storeStatus.settings.currency_symbol) ?? submittedForm.formatting.currencySymbol,
            thousandSeparator: storeStatus.settings.thousand_separator ?? submittedForm.formatting.thousandSeparator,
            decimalSeparator: storeStatus.settings.decimal_separator ?? submittedForm.formatting.decimalSeparator,
            numberOfDecimals: storeStatus.settings.number_of_decimals ?? submittedForm.formatting.numberOfDecimals,
          };
        }

        await submitAction(submittedForm);
        showToast({
          title: responses[action].successTitle,
          message: responses[action].successMessage,
          style: Toast.Style.Success,
        });
        pop();
      } catch (error) {
        console.error(error);
        await showFailureToast({
          title: responses[action].errorTitle,
          message: responses[action].errorMessage,
        });
      } finally {
        setLoadingStatus(false);
      }
    },
    validation: {
      name: (value) => {
        if (!value || value.trim() === "") return "Store Name is required";
      },
      storeUrl: (value) => {
        if (!value || value.trim() === "") return "Store URL is required";
        try {
          new URL(value);
          return null;
        } catch {
          return "Invalid URL format";
        }
      },
      consumerKey: FormValidation.Required,
      consumerSecret: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={loadingStatus}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={store ? "Edit Store" : "Add Store"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Store Name" placeholder="My Store" {...itemProps.name} />
      <Form.TextField title="Store URL" placeholder="https://mystore.com" {...itemProps.storeUrl} />
      <Form.PasswordField title="Consumer Key" placeholder="ck_..." {...itemProps.consumerKey} />
      <Form.PasswordField title="Consumer Secret" placeholder="cs_..." {...itemProps.consumerSecret} />
      <Form.Checkbox label="Favourite" {...itemProps.favourite} />
      <Form.Separator />
      <Form.Checkbox label="Local Store (skip SSL verification)" {...itemProps.local} />
      <Form.Description
        title="Local Store"
        text="Enable this only for local development stores with self-signed SSL certificates. This disables SSL verification for this store."
      />
    </Form>
  );
}
