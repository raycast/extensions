import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { saveCustomService, useCustomServices } from "./custom-services";
import { useSubscriptions } from "./storage";
import {
  applyServiceSelection,
  BillingCycleDropdown,
  CategoryAndPaymentFields,
  CurrencyDropdown,
  CUSTOM_SERVICE_VALUE,
  getServiceBySelection,
  ServiceDropdown,
  SubscriptionFormValues,
  validateSubscriptionFormInput,
} from "./subscription-form-fields";
import { BillingCycle, Subscription } from "./types";
import { generateId, PRESET_PAYMENT_METHODS, PRESET_SERVICES } from "./utils";

export function AddSubscriptionForm() {
  const { addSubscription } = useSubscriptions();
  const { value: customServices = [] } = useCustomServices();
  const { pop } = useNavigation();
  const [paymentSelection, setPaymentSelection] = useState(PRESET_PAYMENT_METHODS[0].value);
  const [serviceSelection, setServiceSelection] = useState("__none__");
  const [category, setCategory] = useState("Entertainment");
  const [customCategoryDefaultValue, setCustomCategoryDefaultValue] = useState("");
  const [listSelection, setListSelection] = useState("Personal");
  const { primaryCurrency } = getPreferenceValues<Preferences>();
  const { value: lastCurrency, setValue: setLastCurrency } = useLocalStorage<string>("last-currency", primaryCurrency);

  const services = [...PRESET_SERVICES, ...customServices];
  const isCustomService = serviceSelection === CUSTOM_SERVICE_VALUE;

  async function handleSubmit(values: SubscriptionFormValues) {
    const parsed = await validateSubscriptionFormInput(
      values,
      serviceSelection,
      paymentSelection,
      isCustomService,
      services,
      {
        requireServiceSelection: true,
        invalidAmountMessage: "Enter a valid positive number",
      },
    );
    if (!parsed) return;

    const { amount, name, iconUrl, paymentMethod, category, list, startDate, billingDay } = parsed;

    const sub: Subscription = {
      id: generateId(),
      name,
      billingDay,
      startDate,
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      category,
      paymentMethod,
      list,
      iconUrl,
      notes: values.notes || undefined,
      status: "active",
    };

    const selectedService = getServiceBySelection(serviceSelection, services);
    if (isCustomService || selectedService?.custom) {
      await saveCustomService({ name, iconUrl, category });
    }
    await setLastCurrency(values.currency);
    await addSubscription(sub);
    await showToast({ style: Toast.Style.Success, title: "Subscription Added", message: sub.name });
    pop();
  }

  return (
    <Form
      navigationTitle="Add Subscription"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Subscription" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <ServiceDropdown
        serviceSelection={serviceSelection}
        services={services}
        onServiceChange={(value) =>
          applyServiceSelection(value, setServiceSelection, setCategory, setCustomCategoryDefaultValue, services)
        }
        showPlaceholder
      />
      {isCustomService && (
        <Form.TextField id="customName" title="Service Name" placeholder="Enter service name…" autoFocus />
      )}

      <Form.Separator />

      <Form.TextField id="amount" title="Amount" placeholder="9.99" />
      <CurrencyDropdown defaultValue={lastCurrency ?? primaryCurrency} />

      <Form.Separator />

      <BillingCycleDropdown defaultValue="monthly" detailed />
      <Form.DatePicker id="startDate" title="Start Date" defaultValue={new Date()} type={Form.DatePicker.Type.Date} />

      <Form.Separator />

      <CategoryAndPaymentFields
        category={category}
        onCategoryChange={setCategory}
        paymentSelection={paymentSelection}
        onPaymentSelectionChange={setPaymentSelection}
        listSelection={listSelection}
        onListChange={setListSelection}
        customCategoryDefaultValue={customCategoryDefaultValue}
      />

      <Form.Separator />

      {isCustomService && (
        <Form.TextField id="iconUrl" title="Website URL" placeholder="Leave empty to auto-detect from name" />
      )}
      <Form.TextArea id="notes" title="Notes" placeholder="Any additional notes…" />
    </Form>
  );
}

export default function AddSubscriptionCommand() {
  return <AddSubscriptionForm />;
}
