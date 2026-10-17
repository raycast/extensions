import { Form, Icon, Toast, showToast } from "@raycast/api";
import {
  CATEGORIES,
  CURRENCIES,
  LISTS,
  PRESET_PAYMENT_METHODS,
  PRESET_SERVICES,
  formatStartDate,
  getServiceIcon,
  getServiceUrl,
} from "./utils";

const SERVICE_CATEGORIES = [...new Set(PRESET_SERVICES.map((s) => s.category))];

export interface SubscriptionFormValues {
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

export function applyServiceSelection(
  value: string,
  setServiceSelection: (value: string) => void,
  setCategory: (category: string) => void,
) {
  setServiceSelection(value);
  const preset = PRESET_SERVICES.find((s) => s.name === value);
  if (preset) setCategory(preset.category);
}

export function parseSubscriptionFormFields(
  values: SubscriptionFormValues,
  serviceSelection: string,
  paymentSelection: string,
  isCustomService: boolean,
) {
  const name = isCustomService ? values.customName?.trim() : serviceSelection;
  const preset = PRESET_SERVICES.find((s) => s.name === serviceSelection);
  const iconUrl = preset
    ? getServiceUrl(preset.domain, true)
    : values.iconUrl?.trim() || getServiceUrl(values.customName);
  const paymentMethod =
    paymentSelection === "__custom__" ? values.customPaymentMethod?.trim() || undefined : paymentSelection;

  return {
    name,
    iconUrl,
    paymentMethod,
    startDate: formatStartDate(values.startDate),
    billingDay: values.startDate.getDate(),
  };
}

type ParsedSubscriptionFields = ReturnType<typeof parseSubscriptionFormFields>;

export async function validateSubscriptionFormInput(
  values: SubscriptionFormValues,
  serviceSelection: string,
  paymentSelection: string,
  isCustomService: boolean,
  options?: { requireServiceSelection?: boolean; invalidAmountMessage?: string },
): Promise<({ amount: number } & ParsedSubscriptionFields) | null> {
  const amount = parseFloat(values.amount);
  if (isNaN(amount) || amount <= 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid amount",
      ...(options?.invalidAmountMessage ? { message: options.invalidAmountMessage } : {}),
    });
    return null;
  }

  if (options?.requireServiceSelection && serviceSelection === "__none__") {
    await showToast({ style: Toast.Style.Failure, title: "Please select a service" });
    return null;
  }

  const fields = parseSubscriptionFormFields(values, serviceSelection, paymentSelection, isCustomService);
  if (!fields.name) {
    await showToast({ style: Toast.Style.Failure, title: "Service name required" });
    return null;
  }

  return { amount, ...fields };
}

export function ServiceDropdown({
  serviceSelection,
  onServiceChange,
  showPlaceholder = false,
}: {
  serviceSelection: string;
  onServiceChange: (value: string) => void;
  showPlaceholder?: boolean;
}) {
  return (
    <Form.Dropdown id="serviceSelection" title="Service" value={serviceSelection} onChange={onServiceChange}>
      {showPlaceholder && <Form.Dropdown.Item value="__none__" title="Select a service…" icon={Icon.Circle} />}
      {SERVICE_CATEGORIES.map((cat) => (
        <Form.Dropdown.Section key={cat} title={cat}>
          {PRESET_SERVICES.filter((s) => s.category === cat).map((s) => (
            <Form.Dropdown.Item key={s.name} value={s.name} title={s.name} icon={getServiceIcon(s.domain)} />
          ))}
        </Form.Dropdown.Section>
      ))}
      <Form.Dropdown.Section>
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

export function CurrencyDropdown({ defaultValue }: { defaultValue: string }) {
  return (
    <Form.Dropdown id="currency" title="Currency" defaultValue={defaultValue}>
      {CURRENCIES.map((c) => (
        <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} icon={c.flag} />
      ))}
    </Form.Dropdown>
  );
}

export function BillingCycleDropdown({ defaultValue, detailed = false }: { defaultValue: string; detailed?: boolean }) {
  return (
    <Form.Dropdown id="billingCycle" title="Billing Cycle" defaultValue={defaultValue}>
      <Form.Dropdown.Item value="monthly" title="Monthly" />
      <Form.Dropdown.Item value="yearly" title="Yearly" />
      <Form.Dropdown.Item value="quarterly" title={detailed ? "Quarterly (every 3 months)" : "Quarterly"} />
      <Form.Dropdown.Item value="half-yearly" title={detailed ? "Half Yearly (every 6 months)" : "Half Yearly"} />
      <Form.Dropdown.Item value="weekly" title="Weekly" />
    </Form.Dropdown>
  );
}

export function CategoryAndPaymentFields({
  category,
  onCategoryChange,
  paymentSelection,
  onPaymentSelectionChange,
  customPaymentMethodDefaultValue = "",
  listDefaultValue = "Personal",
}: {
  category: string;
  onCategoryChange: (value: string) => void;
  paymentSelection: string;
  onPaymentSelectionChange: (value: string) => void;
  customPaymentMethodDefaultValue?: string;
  listDefaultValue?: string;
}) {
  return (
    <>
      <Form.Dropdown id="category" title="Category" value={category} onChange={onCategoryChange}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="paymentSelection"
        title="Pay With"
        value={paymentSelection}
        onChange={onPaymentSelectionChange}
      >
        {PRESET_PAYMENT_METHODS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} icon={p.icon} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown>
      {paymentSelection === "__custom__" && (
        <Form.TextField
          id="customPaymentMethod"
          title="Custom Payment Method"
          defaultValue={customPaymentMethodDefaultValue}
          placeholder="e.g. PayPal, Google Pay, Wallet…"
        />
      )}
      <Form.Dropdown id="list" title="List" defaultValue={listDefaultValue}>
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
      </Form.Dropdown>
    </>
  );
}
