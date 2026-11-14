import { useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  environment,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { InvoiceData, renderHtml, renderMarkdown } from "./render";

const EXAMPLE = `{
  "invoice_number": "INV-0001",
  "from": "Your Name",
  "to": "Client Name",
  "date": "2026-10-23",
  "due_date": "2026-11-06",
  "items": [
    { "description": "Design work", "qty": 10, "rate": 50 },
    { "description": "Development", "qty": 20, "rate": 60 }
  ],
  "tax_rate": 0,
  "notes": "Thanks for your business!"
}`;

function PreviewResult({ data }: { data: InvoiceData }) {
  const { pop } = useNavigation();
  const markdown = renderMarkdown(data);
  const html = renderHtml(data);

  async function copyHtml() {
    await Clipboard.copy(html);
    await showToast({
      style: Toast.Style.Success,
      title: "HTML copied to clipboard",
    });
  }

  async function saveHtml() {
    try {
      const dir = path.join(os.homedir(), "Downloads");
      fs.mkdirSync(dir, { recursive: true });
      const base = (data.invoice_number || "invoice").replace(
        /[^a-z0-9-_]/gi,
        "_",
      );
      let file = path.join(dir, `${base}.html`);
      let suffix = 1;
      while (fs.existsSync(file)) {
        file = path.join(dir, `${base}_${suffix}.html`);
        suffix += 1;
      }
      fs.writeFileSync(file, html, "utf8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: file,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save HTML",
        message,
      });
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy Html" onAction={copyHtml} />
          <Action title="Save Html to Downloads" onAction={saveHtml} />
          <Action title="Edit JSON Again" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(values: { json: string }) {
    try {
      const data = JSON.parse(values.json) as InvoiceData;
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("JSON must include a non-empty 'items' array");
      }
      data.items.forEach((item, idx) => {
        if (
          item === null ||
          typeof item !== "object" ||
          typeof (item as { description?: unknown }).description !== "string" ||
          typeof (item as { qty?: unknown }).qty !== "number" ||
          typeof (item as { rate?: unknown }).rate !== "number"
        ) {
          throw new Error(
            `Item ${idx + 1} must be an object with a string 'description' and numeric 'qty' and 'rate'`,
          );
        }
      });
      setError(undefined);
      push(<PreviewResult data={data} />);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid invoice JSON",
        message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Invoice" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="Invoice JSON"
        placeholder={EXAMPLE}
        defaultValue={environment.isDevelopment ? EXAMPLE : undefined}
        error={error}
        enableMarkdown={false}
      />
      <Form.Description text="Paste invoice data as JSON (invoice_number, from, to, date, due_date, items[], tax_rate, notes) and hit Preview Invoice. No data leaves your machine." />
    </Form>
  );
}
