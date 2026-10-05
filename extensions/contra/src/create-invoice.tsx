import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { formatUSD } from "./lib/contra";
import { callTool } from "./lib/mcp";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

interface PrepareResult {
  ok?: boolean;
  draftId?: string;
  draft?: { id?: string };
  preview?: unknown;
  // Contra returns a human-readable preview; we render whatever we get.
  [key: string]: unknown;
}

export default function Command() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: {
    email: string;
    firstName: string;
    lastName: string;
    desc1: string;
    qty1: string;
    rate1: string;
    desc2: string;
    qty2: string;
    rate2: string;
    dueUponReceipt: boolean;
    dueDate: Date | null;
    contractorCoversFees: boolean;
    memo: string;
  }) {
    const items: LineItem[] = [];
    const item1 = await lineItemFromForm(
      values.desc1,
      values.qty1,
      values.rate1,
      "Line item 1",
    );
    if (item1 === "invalid") return;
    if (item1) items.push(item1);

    const item2 = await lineItemFromForm(
      values.desc2,
      values.qty2,
      values.rate2,
      "Line item 2",
    );
    if (item2 === "invalid") return;
    if (item2) items.push(item2);

    if (!values.email.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Client email is required",
      });
      return;
    }
    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add at least one line item",
      });
      return;
    }
    if (!values.dueUponReceipt && !values.dueDate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick a due date or choose 'due upon receipt'",
      });
      return;
    }

    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing invoice…",
    });
    try {
      const args: Record<string, unknown> = {
        client: {
          email: values.email.trim(),
          ...(values.firstName.trim()
            ? { firstName: values.firstName.trim() }
            : {}),
          ...(values.lastName.trim()
            ? { lastName: values.lastName.trim() }
            : {}),
        },
        items,
        dueUponReceipt: values.dueUponReceipt,
        platformFeeCover: values.contractorCoversFees,
        processingFeeCover: values.contractorCoversFees,
        ...(values.memo.trim() ? { memo: values.memo.trim() } : {}),
      };
      if (!values.dueUponReceipt && values.dueDate) {
        args.dueDate = values.dueDate.toISOString().slice(0, 10);
      }

      const result = await callTool<PrepareResult>(
        "create_invoice_prepare",
        args,
      );
      const draftId = result.draftId ?? result.draft?.id;
      if (!draftId) {
        throw new Error("Contra did not return a draft id to confirm.");
      }
      toast.hide();
      push(<ConfirmInvoice draftId={draftId} preview={result} />);
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't prepare invoice" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Invoice"
            icon={Icon.Eye}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Draft a Contra invoice. You'll see a preview before anything is sent." />
      <Form.TextField
        id="email"
        title="Client Email"
        placeholder="client@company.com"
      />
      <Form.TextField
        id="firstName"
        title="First Name"
        placeholder="(only if not on Contra)"
      />
      <Form.TextField
        id="lastName"
        title="Last Name"
        placeholder="(only if not on Contra)"
      />
      <Form.Separator />
      <Form.TextField
        id="desc1"
        title="Line Item 1"
        placeholder="e.g. Framer development"
      />
      <Form.TextField id="qty1" title="Quantity" defaultValue="1" />
      <Form.TextField id="rate1" title="Rate" placeholder="150" />
      <Form.Separator />
      <Form.TextField
        id="desc2"
        title="Line Item 2 (optional)"
        placeholder=""
      />
      <Form.TextField id="qty2" title="Quantity" defaultValue="1" />
      <Form.TextField id="rate2" title="Rate" placeholder="" />
      <Form.Separator />
      <Form.Checkbox
        id="dueUponReceipt"
        label="Due upon receipt"
        defaultValue={true}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Checkbox
        id="contractorCoversFees"
        label="I cover Contra's platform & processing fees"
        defaultValue={false}
      />
      <Form.TextArea
        id="memo"
        title="Memo"
        placeholder="Optional note on the invoice"
      />
    </Form>
  );
}

function ConfirmInvoice({
  draftId,
  preview,
}: {
  draftId: string;
  preview: PrepareResult;
}) {
  const { pop } = useNavigation();
  const [sending, setSending] = useState(false);

  async function confirm() {
    setSending(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending invoice…",
    });
    try {
      const res = await callTool<{ invoiceUrl?: string }>(
        "create_invoice_confirm",
        {
          confirm: true,
          draftId,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Invoice sent";
      if (res.invoiceUrl) {
        toast.primaryAction = {
          title: "Open Invoice",
          onAction: () => open(res.invoiceUrl!),
        };
      }
      pop();
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't send invoice" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Detail
      isLoading={sending}
      markdown={renderPreview(preview)}
      actions={
        <ActionPanel>
          <Action title="Send Invoice" icon={Icon.Upload} onAction={confirm} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function renderPreview(result: PrepareResult): string {
  const raw = (result.preview ?? result) as Record<string, unknown>;
  const lines: string[] = [
    "# Invoice Preview",
    "",
    "Review carefully — pressing **Send Invoice** issues it to the client.",
    "",
  ];

  const client = raw.client as Record<string, unknown> | undefined;
  if (client) {
    lines.push("## Client", "");
    const name = [client.firstName, client.lastName]
      .filter((v) => typeof v === "string" && v.trim())
      .join(" ");
    if (name) lines.push(`**Name:** ${name}`);
    if (typeof client.email === "string" && client.email) {
      lines.push(`**Email:** ${client.email}`);
    }
    lines.push("");
  }

  const items = (raw.items ?? raw.lineItems) as
    Array<Record<string, unknown>> | undefined;
  if (items?.length) {
    lines.push("## Line Items", "");
    lines.push("| Description | Qty | Rate | Amount |");
    lines.push("| --- | ---: | ---: | ---: |");
    let subtotal = 0;
    for (const item of items) {
      const qty = positiveNum(item.quantity, 1);
      const rate = positiveNum(item.rate ?? item.unitPrice, 0);
      const amount = qty * rate;
      subtotal += amount;
      const desc =
        typeof item.description === "string" ? item.description : "—";
      lines.push(
        `| ${desc} | ${qty} | ${formatUSD(rate)} | ${formatUSD(amount)} |`,
      );
    }
    lines.push("", `**Subtotal:** ${formatUSD(subtotal)}`, "");
  }

  const total =
    typeof raw.total === "string"
      ? raw.total
      : typeof raw.totalAmount === "string"
        ? raw.totalAmount
        : typeof raw.total === "number"
          ? formatUSD(raw.total)
          : null;
  if (total) lines.push(`**Total:** ${total}`, "");

  if (raw.dueUponReceipt === true) {
    lines.push("**Due:** Upon receipt", "");
  } else if (typeof raw.dueDate === "string" && raw.dueDate) {
    lines.push(`**Due date:** ${raw.dueDate}`, "");
  }

  if (typeof raw.memo === "string" && raw.memo.trim()) {
    lines.push("## Memo", "", raw.memo.trim(), "");
  }

  const fees = [raw.platformFee, raw.processingFee, raw.fees].filter(
    (v) => v != null,
  );
  if (fees.length) {
    lines.push("## Fees", "");
    for (const fee of fees) {
      lines.push(`- ${formatFee(fee)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatFee(fee: unknown): string {
  if (typeof fee === "string") return fee;
  if (typeof fee === "number") return formatUSD(fee);
  return JSON.stringify(fee);
}

function positiveNum(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function lineItemFromForm(
  desc: string,
  qtyStr: string,
  rateStr: string,
  label: string,
): Promise<LineItem | null | "invalid"> {
  if (!desc.trim()) return null;

  const qty = parsePositive(qtyStr);
  if (qty === null) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${label}: enter a positive quantity`,
    });
    return "invalid";
  }

  const rate = parsePositive(rateStr);
  if (rate === null) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${label}: enter a positive rate`,
    });
    return "invalid";
  }

  return { description: desc.trim(), quantity: qty, rate };
}

function parsePositive(value: string): number | null {
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
