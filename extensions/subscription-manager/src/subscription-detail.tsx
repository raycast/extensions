import { Action, ActionPanel, Detail, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useSubscriptions } from "./storage";
import { confirmAndDeleteSubscription } from "./subscription-actions";
import {
  applyServiceSelection,
  BillingCycleDropdown,
  CategoryAndPaymentFields,
  CurrencyDropdown,
  ServiceDropdown,
  SubscriptionFormValues,
  validateSubscriptionFormInput,
} from "./subscription-form-fields";
import { BillingCycle, Subscription } from "./types";
import { PRESET_PAYMENT_METHODS, PRESET_SERVICES, formatCurrency, getNextBillingDate } from "./utils";

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

  async function handleSubmit(values: SubscriptionFormValues) {
    const parsed = await validateSubscriptionFormInput(values, serviceSelection, paymentSelection, isCustomService);
    if (!parsed) return;

    const { amount, name, iconUrl, paymentMethod, startDate, billingDay } = parsed;

    await onSave({
      name,
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      billingDay,
      startDate,
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
      <ServiceDropdown
        serviceSelection={serviceSelection}
        onServiceChange={(value) => applyServiceSelection(value, setServiceSelection, setCategory)}
      />
      {isCustomService && (
        <Form.TextField id="customName" title="Service Name" defaultValue={matchedService ? "" : sub.name} />
      )}
      <Form.Separator />
      <Form.TextField id="amount" title="Amount" defaultValue={String(sub.amount)} />
      <CurrencyDropdown defaultValue={sub.currency} />
      <Form.Separator />
      <BillingCycleDropdown defaultValue={sub.billingCycle} />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        defaultValue={new Date(sub.startDate + "T00:00:00")}
        type={Form.DatePicker.Type.Date}
      />
      <Form.Separator />
      <CategoryAndPaymentFields
        category={category}
        onCategoryChange={setCategory}
        paymentSelection={paymentSelection}
        onPaymentSelectionChange={setPaymentSelection}
        customPaymentMethodDefaultValue={isPresetPayment ? "" : (sub.paymentMethod ?? "")}
        listDefaultValue={sub.list}
      />
      <Form.Separator />
      {isCustomService && <Form.TextField id="iconUrl" title="Website URL" defaultValue={sub.iconUrl ?? ""} />}
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
| Started | ${new Date(sub.startDate + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} |
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
            onAction={() => confirmAndDeleteSubscription(sub.name, () => deleteSubscription(id))}
          />
        </ActionPanel>
      }
    />
  );
}
