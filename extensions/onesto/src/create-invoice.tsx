import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { createInvoice, getClients, getNumberings, getPaymentMethods } from "./api";
import { eur, toIsoDate } from "./helpers";

const VAT_RATES = ["22", "10", "5", "4", "0"];
const NATURA_CODES = ["N2.1", "N2.2", "N3.1", "N3.2", "N3.3", "N3.4", "N3.5", "N3.6", "N4", "N5", "N6", "N7"];

async function fetchLookups() {
  const [clients, numberings, methods] = await Promise.all([getClients(), getNumberings(), getPaymentMethods()]);
  return { clients, numberings, methods };
}

export default function CreateInvoice() {
  const { data, isLoading, error } = useCachedPromise(fetchLookups, [], { keepPreviousData: true });
  const [numbering, setNumbering] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [vat, setVat] = useState<string>("22");
  const [submitting, setSubmitting] = useState(false);

  const clients = data?.clients ?? [];
  const numberings = data?.numberings ?? [];
  const methods = data?.methods ?? [];

  // When the numbering changes, preselect its default payment method (if any).
  const currentNumbering = useMemo(
    () => numberings.find((n) => n.name === numbering) ?? numberings[0],
    [numberings, numbering],
  );

  function onNumberingChange(name: string) {
    setNumbering(name);
    const def = numberings.find((n) => n.name === name)?.default_payment_method;
    if (def && methods.some((m) => m.name === def)) {
      setMethod(def);
    }
  }

  async function submit(values: {
    clientId: string;
    numbering: string;
    method: string;
    issueDate: Date | null;
    itemName: string;
    itemDescription: string;
    quantity: string;
    price: string;
    vat: string;
    natura: string;
    sendSdi: boolean;
    alreadyPaid: boolean;
    note: string;
  }) {
    if (submitting) return;

    const client = clients.find((c) => String(c.id) === values.clientId);
    if (!client) {
      await showToast({ style: Toast.Style.Failure, title: "Select a client" });
      return;
    }
    if (!client.piva) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Client has no VAT number",
        message: "Add the VAT number to this client in Onesto before invoicing it via API.",
      });
      return;
    }
    if (!client.address || !client.cap || !client.city || (client.country === "IT" && !client.province)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Client address is incomplete",
        message: "Complete address, ZIP, city and province in Onesto first.",
      });
      return;
    }
    if (!values.itemName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a line item description" });
      return;
    }

    const quantity = Number(values.quantity.replace(",", "."));
    const price = Number(values.price.replace(",", "."));
    const vatRate = Number(values.vat);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid quantity" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid unit price" });
      return;
    }

    const subtotal = quantity * price;
    const total = subtotal * (1 + vatRate / 100);

    const confirmed = await confirmAlert({
      title: "Issue Invoice?",
      message:
        `${eur(total)} (VAT incl.) to ${client.name}.\n\n` +
        (values.sendSdi
          ? "The invoice will be SENT TO SDI (Italian tax authority exchange). This cannot be undone."
          : "The invoice will NOT be sent to SDI (you can send it later from Onesto)."),
      primaryAction: { title: "Issue Invoice", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Issuing invoice…" });
    try {
      const created = await createInvoice({
        cliente: {
          name: client.name,
          piva: client.piva,
          address: client.address ?? "",
          cap: client.cap ?? "",
          city: client.city ?? "",
          province: client.province ?? undefined,
          country: client.country ?? "IT",
          sdi: client.sdi ?? undefined,
          pec: client.pec ?? undefined,
        },
        numerazione: values.numbering,
        issue_date: values.issueDate ? toIsoDate(values.issueDate) : toIsoDate(new Date()),
        metodo_pagamento: values.method,
        articoli: [
          {
            nome: values.itemName.trim(),
            quantita: quantity,
            prezzo: price,
            iva: vatRate,
            natura: vatRate === 0 && values.natura ? values.natura : undefined,
            descrizione: values.itemDescription.trim() || undefined,
          },
        ],
        note: values.note.trim() || undefined,
        invia_sdi: values.sendSdi,
        paid: values.alreadyPaid ? Number(total.toFixed(2)) : undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Invoice ${created.number ?? ""} issued`;
      toast.message = eur(created.total ?? total);
      if (created.uuid) {
        const pdfUrl = `https://fatture.onesto.it/${created.uuid}/pdf`;
        toast.primaryAction = {
          title: "Open PDF",
          onAction: () => {
            void open(pdfUrl);
          },
        };
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not issue the invoice";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Onesto Integrations" url="https://app.onesto.it/company/integrations" />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={error.message} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading || submitting}
      navigationTitle="Create Invoice"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Issue Invoice" icon={Icon.Envelope} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="clientId" title="Client" storeValue>
        {clients.map((c) => (
          <Form.Dropdown.Item
            key={c.id}
            value={String(c.id)}
            title={c.piva ? c.name : `${c.name} (no VAT number)`}
            keywords={c.piva ? [c.piva] : undefined}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="numbering" title="Numbering" value={currentNumbering?.name ?? ""} onChange={onNumberingChange}>
        {numberings.map((n) => (
          <Form.Dropdown.Item key={n.id} value={n.name} title={n.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="method" title="Payment Method" value={method || (methods[0]?.name ?? "")} onChange={setMethod}>
        {methods.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.name} title={m.name} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker id="issueDate" title="Issue Date" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />

      <Form.Separator />

      <Form.TextField id="itemName" title="Line Item" placeholder="e.g. Consulting — July 2026" />
      <Form.TextField id="itemDescription" title="Item Details" placeholder="Optional longer description" />
      <Form.TextField id="quantity" title="Quantity" defaultValue="1" />
      <Form.TextField id="price" title="Unit Price (€, net)" placeholder="e.g. 1000.00" />
      <Form.Dropdown id="vat" title="VAT Rate" value={vat} onChange={setVat}>
        {VAT_RATES.map((r) => (
          <Form.Dropdown.Item key={r} value={r} title={`${r}%`} />
        ))}
      </Form.Dropdown>
      {vat === "0" && (
        <Form.Dropdown id="natura" title="VAT Exemption (Natura)" defaultValue="N2.2">
          {NATURA_CODES.map((n) => (
            <Form.Dropdown.Item key={n} value={n} title={n} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.Checkbox id="sendSdi" label="Send to SDI (Italian e-invoicing exchange)" defaultValue={true} />
      <Form.Checkbox id="alreadyPaid" label="Already collected in full (register payment now)" defaultValue={false} />
      <Form.TextArea id="note" title="Notes" placeholder="Optional notes printed on the invoice" />
    </Form>
  );
}
