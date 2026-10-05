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
import { ServiceDefinition } from "./types";

export const CUSTOM_SERVICE_VALUE = "__custom__";
const SERVICE_VALUE_PREFIX = {
  preset: "preset:",
  custom: "custom:",
};

export interface SubscriptionFormValues {
  customName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  startDate: Date;
  category: string;
  customCategory: string;
  customPaymentMethod: string;
  list: string;
  customList: string;
  iconUrl: string;
  notes: string;
}

export function getServiceSelectionValue(service: ServiceDefinition): string {
  return `${service.custom ? SERVICE_VALUE_PREFIX.custom : SERVICE_VALUE_PREFIX.preset}${encodeURIComponent(service.name)}`;
}

export function getServiceBySelection(
  value: string,
  services: ServiceDefinition[] = PRESET_SERVICES,
): ServiceDefinition | undefined {
  if (value.startsWith(SERVICE_VALUE_PREFIX.custom)) {
    const name = decodeURIComponent(value.slice(SERVICE_VALUE_PREFIX.custom.length));
    return services.find((s) => s.custom && s.name === name);
  }

  if (value.startsWith(SERVICE_VALUE_PREFIX.preset)) {
    const name = decodeURIComponent(value.slice(SERVICE_VALUE_PREFIX.preset.length));
    return services.find((s) => !s.custom && s.name === name);
  }

  return services.find((s) => s.name === value);
}

export function getCategorySelectionValue(category: string): { category: string; customCategory: string } {
  if (CATEGORIES.includes(category)) return { category, customCategory: "" };
  return { category: "__custom__", customCategory: category };
}

export function applyServiceSelection(
  value: string,
  setServiceSelection: (value: string) => void,
  setCategory: (category: string) => void,
  setCustomCategoryDefaultValue: (category: string) => void,
  services: ServiceDefinition[] = PRESET_SERVICES,
) {
  setServiceSelection(value);
  const service = getServiceBySelection(value, services);
  if (!service) return;

  const nextCategory = getCategorySelectionValue(service.category);
  setCategory(nextCategory.category);
  setCustomCategoryDefaultValue(nextCategory.customCategory);
}

export function parseSubscriptionFormFields(
  values: SubscriptionFormValues,
  serviceSelection: string,
  paymentSelection: string,
  isCustomService: boolean,
  services: ServiceDefinition[] = PRESET_SERVICES,
) {
  const customName = values.customName?.trim() ?? "";
  const service = getServiceBySelection(serviceSelection, services);
  const name = isCustomService ? customName : (service?.name ?? serviceSelection);
  const iconUrl = service
    ? getServiceUrl(service.domain, true)
    : values.iconUrl?.trim() || (customName ? getServiceUrl(customName) : undefined);
  const paymentMethod =
    paymentSelection === "__custom__" ? values.customPaymentMethod?.trim() || undefined : paymentSelection;
  const category = values.category === "__custom__" ? values.customCategory?.trim() : values.category;
  const list = values.list === "__custom__" ? values.customList?.trim() : values.list;

  return {
    name,
    iconUrl,
    paymentMethod,
    category,
    list,
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
  services?: ServiceDefinition[],
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

  const fields = parseSubscriptionFormFields(values, serviceSelection, paymentSelection, isCustomService, services);
  if (!fields.name) {
    await showToast({ style: Toast.Style.Failure, title: "Service name required" });
    return null;
  }
  if (!fields.category) {
    await showToast({ style: Toast.Style.Failure, title: "Category required" });
    return null;
  }
  if (!fields.list) {
    await showToast({ style: Toast.Style.Failure, title: "List required" });
    return null;
  }

  return { amount, ...fields };
}

export function ServiceDropdown({
  serviceSelection,
  onServiceChange,
  services = PRESET_SERVICES,
  showPlaceholder = false,
}: {
  serviceSelection: string;
  onServiceChange: (value: string) => void;
  services?: ServiceDefinition[];
  showPlaceholder?: boolean;
}) {
  const builtInServices = services.filter((s) => !s.custom);
  const customServices = services.filter((s) => s.custom);
  const builtInCategories = [...new Set(builtInServices.map((s) => s.category))];

  return (
    <Form.Dropdown id="serviceSelection" title="Service" value={serviceSelection} onChange={onServiceChange}>
      {showPlaceholder && <Form.Dropdown.Item value="__none__" title="Select a service…" icon={Icon.Circle} />}
      {builtInCategories.map((cat) => (
        <Form.Dropdown.Section key={cat} title={cat}>
          {builtInServices
            .filter((s) => s.category === cat)
            .map((s) => (
              <Form.Dropdown.Item
                key={getServiceSelectionValue(s)}
                value={getServiceSelectionValue(s)}
                title={s.name}
                icon={getServiceIcon(s.domain)}
              />
            ))}
        </Form.Dropdown.Section>
      ))}
      {customServices.length > 0 && (
        <Form.Dropdown.Section title="Custom">
          {customServices.map((s) => (
            <Form.Dropdown.Item
              key={getServiceSelectionValue(s)}
              value={getServiceSelectionValue(s)}
              title={s.name}
              icon={getServiceIcon(s.domain)}
            />
          ))}
        </Form.Dropdown.Section>
      )}
      <Form.Dropdown.Section>
        <Form.Dropdown.Item
          value={CUSTOM_SERVICE_VALUE}
          title="Other…"
          icon={Icon.Pencil}
          keywords={["custom", "add", "new", "create", "service", "subscription", "other"]}
        />
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
  listSelection,
  onListChange,
  customPaymentMethodDefaultValue = "",
  customCategoryDefaultValue = "",
  customListDefaultValue = "",
}: {
  category: string;
  onCategoryChange: (value: string) => void;
  paymentSelection: string;
  onPaymentSelectionChange: (value: string) => void;
  listSelection: string;
  onListChange: (value: string) => void;
  customPaymentMethodDefaultValue?: string;
  customCategoryDefaultValue?: string;
  customListDefaultValue?: string;
}) {
  return (
    <>
      <Form.Dropdown id="category" title="Category" value={category} onChange={onCategoryChange}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown>
      {category === "__custom__" && (
        <Form.TextField
          key={customCategoryDefaultValue}
          id="customCategory"
          title="Custom Category"
          defaultValue={customCategoryDefaultValue}
          placeholder="e.g. Education, Hosting, Design…"
        />
      )}
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
      <Form.Dropdown id="list" title="List" value={listSelection} onChange={onListChange}>
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown>
      {listSelection === "__custom__" && (
        <Form.TextField
          id="customList"
          title="Custom List"
          defaultValue={customListDefaultValue}
          placeholder="e.g. Side Project, Household, Client…"
        />
      )}
    </>
  );
}
