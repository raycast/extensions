import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, V1Invoice, getPaymentMethods, getUnpaidInvoices, registerPayment } from "./api";
import { ErrorView } from "./components";
import { daysLate, eur, fmtDate, todayIso } from "./helpers";

export default function UnpaidInvoices() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getUnpaidInvoices, [], { keepPreviousData: true });

  const overdue = (data?.items ?? []).filter((i) => i.overdue);
  const open = (data?.items ?? []).filter((i) => !i.overdue);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by client or invoice number…">
      {error ? (
        <ErrorView error={error} />
      ) : (
        <>
          {overdue.length > 0 && (
            <List.Section title="Overdue" subtitle={`${overdue.length}`}>
              {overdue.map((invoice) => (
                <InvoiceItem key={invoice.id} invoice={invoice} onChange={revalidate} />
              ))}
            </List.Section>
          )}
          {open.length > 0 && (
            <List.Section title="Open" subtitle={`${open.length}`}>
              {open.map((invoice) => (
                <InvoiceItem key={invoice.id} invoice={invoice} onChange={revalidate} />
              ))}
            </List.Section>
          )}
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="All Invoices Collected"
            description="Nothing left to collect — well done!"
          />
        </>
      )}
    </List>
  );
}

function InvoiceItem({ invoice, onChange }: { invoice: V1Invoice; onChange: () => void }) {
  const late = daysLate(invoice.due_date);
  const accessories: List.Item.Accessory[] = [];

  if (invoice.payment_status === "partial") {
    accessories.push({ tag: { value: "Partial", color: Color.Orange }, tooltip: `Paid ${eur(invoice.amount_paid)}` });
  }
  if (invoice.due_date) {
    accessories.push({
      tag: invoice.overdue
        ? { value: `${fmtDate(invoice.due_date)} · ${late}d late`, color: Color.Red }
        : { value: fmtDate(invoice.due_date), color: Color.SecondaryText },
      tooltip: "Payment due date",
    });
  }
  accessories.push({ text: eur(invoice.amount_due ?? invoice.total_amount), tooltip: "Amount due" });

  return (
    <List.Item
      icon={invoice.overdue ? { source: Icon.Receipt, tintColor: Color.Red } : Icon.Receipt}
      title={invoice.counterpart.name ?? "Unknown client"}
      subtitle={invoice.number ?? undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {invoice.uuid && (
              <Action.Push
                title="Register Payment"
                icon={Icon.BankNote}
                target={<RegisterPaymentForm invoice={invoice} onDone={onChange} />}
              />
            )}
            {invoice.pdf_url && <Action.OpenInBrowser title="Open PDF" icon={Icon.Document} url={invoice.pdf_url} />}
            <Action.OpenInBrowser
              title="Open in Onesto"
              icon={Icon.Globe}
              url={`${APP_URL}/fatture`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Amount Due"
              content={(invoice.amount_due ?? invoice.total_amount).toFixed(2)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {invoice.number && (
              <Action.CopyToClipboard
                title="Copy Invoice Number"
                content={invoice.number}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onChange}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RegisterPaymentForm({ invoice, onDone }: { invoice: V1Invoice; onDone: () => void }) {
  const { pop } = useNavigation();
  const { data: methods } = useCachedPromise(getPaymentMethods, [], { keepPreviousData: true });
  const due = invoice.amount_due ?? invoice.total_amount;

  async function submit(values: { amount: string; paymentDate: Date | null; method: string; note: string }) {
    const amount = Number(values.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid amount" });
      return;
    }
    if (amount > due + 0.005) {
      await showToast({ style: Toast.Style.Failure, title: `Amount exceeds the ${eur(due)} due` });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Register Payment?",
      message: `${eur(amount)} on invoice ${invoice.number ?? ""} — ${invoice.counterpart.name ?? ""}. This is recorded in Onesto.`,
      primaryAction: { title: "Register" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Registering payment…" });
    try {
      const result = await registerPayment(invoice.uuid as string, {
        amount,
        payment_date: values.paymentDate ? values.paymentDate.toISOString().slice(0, 10) : todayIso(),
        metodo_pagamento: values.method || undefined,
        note: values.note || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = result.payment_status === "paid" ? "Invoice fully collected 🎉" : "Payment registered";
      toast.message = result.payment_status === "paid" ? undefined : `Still due: ${eur(result.amount_due)}`;
      onDone();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not register payment";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      navigationTitle={`Register Payment · ${invoice.number ?? ""}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Register Payment" icon={Icon.BankNote} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Invoice" text={`${invoice.counterpart.name ?? ""} · due ${eur(due)}`} />
      <Form.TextField id="amount" title="Amount (€)" defaultValue={due.toFixed(2)} />
      <Form.DatePicker
        id="paymentDate"
        title="Payment Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={new Date()}
      />
      <Form.Dropdown id="method" title="Payment Method" defaultValue="">
        <Form.Dropdown.Item value="" title="—" />
        {(methods ?? []).map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.name} title={m.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="note" title="Note" placeholder="Optional" />
    </Form>
  );
}
