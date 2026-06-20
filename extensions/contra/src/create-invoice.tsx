import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
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
    if (values.desc1.trim()) {
      items.push({
        description: values.desc1.trim(),
        quantity: num(values.qty1, 1),
        rate: num(values.rate1, 0),
      });
    }
    if (values.desc2.trim()) {
      items.push({
        description: values.desc2.trim(),
        quantity: num(values.qty2, 1),
        rate: num(values.rate2, 0),
      });
    }

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
          onAction: () =>
            import("@raycast/api").then((m) => m.open(res.invoiceUrl!)),
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

function renderPreview(preview: PrepareResult): string {
  return [
    "# Invoice Preview",
    "",
    "Review carefully — pressing **Send Invoice** issues it to the client.",
    "",
    "```json",
    JSON.stringify(preview, null, 2),
    "```",
  ].join("\n");
}

function num(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
