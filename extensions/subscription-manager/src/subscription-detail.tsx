import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { useSubscriptions } from "./storage";
import { BillingCycle, Subscription } from "./types";
import {
  CATEGORIES,
  CURRENCIES,
  LISTS,
  PRESET_PAYMENT_METHODS,
  PRESET_SERVICES,
  formatCurrency,
  getFaviconUrl,
  getNextBillingDate,
} from "./utils";

interface EditFormValues {
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

function EditForm({ sub, onSave }: { sub: Subscription; onSave: (updates: Partial<Subscription>) => Promise<void> }) {
  const { pop } = useNavigation();
  const isPresetPayment = PRESET_PAYMENT_METHODS.some((p) => p.value === sub.paymentMethod);
  const [paymentSelection, setPaymentSelection] = useState(
    isPresetPayment ? (sub.paymentMethod ?? PRESET_PAYMENT_METHODS[0].value) : "__custom__",
  );

  const matchedService = PRESET_SERVICES.find((s) => s.name === sub.name);
  const [serviceSelection, setServiceSelection] = useState(matchedService ? sub.name : "__custom__");
  const [category, setCategory] = useState(sub.category);
  const isCustomService = serviceSelection === "__custom__";
  const serviceCategories = [...new Set(PRESET_SERVICES.map((s) => s.category))];

  function handleServiceChange(value: string) {
    setServiceSelection(value);
    const preset = PRESET_SERVICES.find((s) => s.name === value);
    if (preset) setCategory(preset.category);
  }

  async function handleSubmit(values: EditFormValues) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
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

    await onSave({
      name,
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      billingDay: values.startDate.getDate(),
      startDate: `${values.startDate.getFullYear()}-${String(values.startDate.getMonth() + 1).padStart(2, "0")}-${String(values.startDate.getDate()).padStart(2, "0")}`,
      category: values.category,
      paymentMethod,
      list: values.list,
      iconUrl,
      notes: values.notes || undefined,
    });

    await showToast({ style: Toast.Style.Success, title: "Subscription Updated" });
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit ${sub.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="serviceSelection" title="Service" value={serviceSelection} onChange={handleServiceChange}>
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
        <Form.TextField id="customName" title="Service Name" defaultValue={matchedService ? "" : sub.name} />
      )}
      <Form.Separator />
      <Form.TextField id="amount" title="Amount" defaultValue={String(sub.amount)} />
      <Form.Dropdown id="currency" title="Currency" defaultValue={sub.currency}>
        {CURRENCIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} icon={c.flag} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="billingCycle" title="Billing Cycle" defaultValue={sub.billingCycle}>
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="quarterly" title="Quarterly" />
        <Form.Dropdown.Item value="half-yearly" title="Half Yearly" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
      </Form.Dropdown>
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        defaultValue={new Date(sub.startDate)}
        type={Form.DatePicker.Type.Date}
      />
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
          defaultValue={isPresetPayment ? "" : (sub.paymentMethod ?? "")}
          placeholder="e.g. PayPal, Google Pay, Wallet…"
        />
      )}
      <Form.Dropdown id="list" title="List" defaultValue={sub.list}>
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {isCustomService && <Form.TextField id="iconUrl" title="Icon URL" defaultValue={sub.iconUrl ?? ""} />}
      <Form.TextArea id="notes" title="Notes" defaultValue={sub.notes ?? ""} />
    </Form>
  );
}

export function SubscriptionDetail({
  id,
  startEditing = false,
  allIds = [],
}: {
  id: string;
  startEditing?: boolean;
  allIds?: string[];
}) {
  const [editing, setEditing] = useState(startEditing);
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();
  const { push } = useNavigation();

  const sub = subscriptions.find((s) => s.id === id);

  if (!sub) {
    return <Detail markdown="## Subscription not found\n\nThis subscription may have been deleted." />;
  }

  if (editing) {
    return (
      <EditForm
        sub={sub}
        onSave={async (updates) => {
          await updateSubscription(id, updates);
          setEditing(false);
        }}
      />
    );
  }

  const currentIndex = allIds.indexOf(id);
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;

  const nextBillingDate = getNextBillingDate(sub);
  const nextBilling = nextBillingDate
    ? nextBillingDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const markdown = `
# ${sub.name}

| Field | Value |
|---|---|
| Amount | **${formatCurrency(sub.amount, sub.currency)}** / ${sub.billingCycle} |
| Next Billing | ${nextBilling} (day ${sub.billingDay}) |
| Started | ${new Date(sub.startDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} |
| Category | ${sub.category} |
| List | ${sub.list} |
${sub.paymentMethod ? `| Paid With | ${sub.paymentMethod} |\n` : ""}| Status | ${sub.status.charAt(0).toUpperCase() + sub.status.slice(1)} |

${sub.notes ? `---\n\n${sub.notes}` : ""}
`.trim();

  return (
    <Detail
      navigationTitle={sub.name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Edit"
            icon={Icon.Pencil}
            onAction={() => setEditing(true)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title={sub.status === "active" ? "Pause Subscription" : "Resume Subscription"}
            icon={sub.status === "active" ? Icon.Pause : Icon.Play}
            onAction={async () => {
              const next = sub.status === "active" ? "paused" : "active";
              await updateSubscription(id, { status: next });
              await showToast({
                style: Toast.Style.Success,
                title: next === "active" ? "Subscription Resumed" : "Subscription Paused",
              });
              await popToRoot();
            }}
          />
          {allIds.length > 1 && (
            <ActionPanel.Section title="Navigate">
              <Action
                title="Previous Subscription"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={() => prevId && push(<SubscriptionDetail id={prevId} allIds={allIds} />)}
              />
              <Action
                title="Next Subscription"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={() => nextId && push(<SubscriptionDetail id={nextId} allIds={allIds} />)}
              />
            </ActionPanel.Section>
          )}
          <Action
            title="Delete Subscription"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: `Delete "${sub.name}"?`,
                message: "This action cannot be undone.",
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
              });
              if (confirmed) {
                await deleteSubscription(id);
                await showToast({ style: Toast.Style.Success, title: "Subscription Deleted" });
                await popToRoot();
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
