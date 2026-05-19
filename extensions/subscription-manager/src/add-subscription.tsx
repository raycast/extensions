import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { useSubscriptions } from "./storage";
import { BillingCycle, Subscription } from "./types";
import {
  CATEGORIES,
  CURRENCIES,
  LISTS,
  PRESET_PAYMENT_METHODS,
  PRESET_SERVICES,
  generateId,
  getFaviconUrl,
} from "./utils";

interface FormValues {
  customName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  startDate: Date;
  category: string;
  customPaymentMethod: string;
  list: string;
  iconUrl: string;
  notes: string;
}

export function AddSubscriptionForm() {
  const { addSubscription } = useSubscriptions();
  const { pop } = useNavigation();
  const [paymentSelection, setPaymentSelection] = useState(PRESET_PAYMENT_METHODS[0].value);
  const [serviceSelection, setServiceSelection] = useState("__none__");
  const [category, setCategory] = useState("Entertainment");
  const { value: lastCurrency, setValue: setLastCurrency } = useLocalStorage("last-currency", "INR");

  const serviceCategories = [...new Set(PRESET_SERVICES.map((s) => s.category))];
  const isCustomService = serviceSelection === "__custom__";
  const isNoneSelected = serviceSelection === "__none__";

  function handleServiceChange(value: string) {
    setServiceSelection(value);
    const preset = PRESET_SERVICES.find((s) => s.name === value);
    if (preset) setCategory(preset.category);
  }

  async function handleSubmit(values: FormValues) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid amount",
        message: "Enter a valid positive number",
      });
      return;
    }

    if (isNoneSelected) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a service" });
      return;
    }

    const name = isCustomService ? values.customName?.trim() : serviceSelection;
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Service name required" });
      return;
    }

    const preset = PRESET_SERVICES.find((s) => s.name === serviceSelection);
    const iconUrl = preset
      ? `https://www.google.com/s2/favicons?domain=${preset.domain}&sz=64`
      : values.iconUrl || getFaviconUrl(values.customName);

    const paymentMethod =
      paymentSelection === "__custom__" ? values.customPaymentMethod?.trim() || undefined : paymentSelection;

    const sub: Subscription = {
      id: generateId(),
      name,
      billingDay: values.startDate.getDate(),
      startDate: `${values.startDate.getFullYear()}-${String(values.startDate.getMonth() + 1).padStart(2, "0")}-${String(values.startDate.getDate()).padStart(2, "0")}`,
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      category: values.category,
      paymentMethod,
      list: values.list,
      iconUrl,
      notes: values.notes || undefined,
      status: "active",
    };

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
      <Form.Dropdown id="serviceSelection" title="Service" value={serviceSelection} onChange={handleServiceChange}>
        <Form.Dropdown.Item value="__none__" title="Select a service…" icon={Icon.Circle} />
        {serviceCategories.map((cat) => (
          <Form.Dropdown.Section key={cat} title={cat}>
            {PRESET_SERVICES.filter((s) => s.category === cat).map((s) => (
              <Form.Dropdown.Item
                key={s.name}
                value={s.name}
                title={s.name}
                icon={{ source: `https://www.google.com/s2/favicons?domain=${s.domain}&sz=64`, fallback: Icon.Globe }}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {isCustomService && (
        <Form.TextField id="customName" title="Service Name" placeholder="Enter service name…" autoFocus />
      )}

      <Form.Separator />

      <Form.TextField id="amount" title="Amount" placeholder="9.99" />
      <Form.Dropdown id="currency" title="Currency" defaultValue={lastCurrency ?? "INR"}>
        {CURRENCIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} icon={c.flag} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="billingCycle" title="Billing Cycle" defaultValue="monthly">
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="quarterly" title="Quarterly (every 3 months)" />
        <Form.Dropdown.Item value="half-yearly" title="Half Yearly (every 6 months)" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
      </Form.Dropdown>
      <Form.DatePicker id="startDate" title="Start Date" defaultValue={new Date()} type={Form.DatePicker.Type.Date} />

      <Form.Separator />

      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="paymentSelection" title="Pay With" value={paymentSelection} onChange={setPaymentSelection}>
        {PRESET_PAYMENT_METHODS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} icon={p.icon} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown>
      {paymentSelection === "__custom__" && (
        <Form.TextField
          id="customPaymentMethod"
          title="Custom Payment Method"
          placeholder="e.g. PayPal, Google Pay, Wallet…"
        />
      )}
      <Form.Dropdown id="list" title="List" defaultValue="Personal">
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {isCustomService && (
        <Form.TextField id="iconUrl" title="Icon URL" placeholder="Leave empty to auto-detect favicon" />
      )}
      <Form.TextArea id="notes" title="Notes" placeholder="Any additional notes…" />
    </Form>
  );
}

export default function AddSubscriptionCommand() {
  return <AddSubscriptionForm />;
}
