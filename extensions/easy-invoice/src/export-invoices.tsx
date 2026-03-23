import { Action, ActionPanel, Form, getPreferenceValues, Icon, open, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { generateCSV } from "./lib/csv-generator";
import { resolveSaveLocation } from "./lib/formatters";
import { generatePDFSummary } from "./lib/pdf-summary-generator";
import { getClients, getInvoices } from "./lib/storage";
import { Client } from "./lib/types";

function getTaxYearStart(): Date {
  const now = new Date();
  const thisYearStart = new Date(now.getFullYear(), 3, 6); // 6 April this year
  const year = now >= thisYearStart ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 6); // 6 April
}

export default function ExportInvoices() {
  const preferences = getPreferenceValues<Preferences>();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    getClients()
      .then((data) => {
        if (isCancelled) return;
        setClients(data);
      })
      .catch((err) => {
        if (!isCancelled) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load clients",
            message: String(err),
          });
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSubmit(values: Record<string, string | Date>) {
    const format = values.format as string;
    const dateFrom = values.dateFrom as Date | undefined;
    const dateTo = values.dateTo as Date | undefined;
    const clientFilter = values.clientFilter as string;
    const statusFilter = values.statusFilter as string;

    try {
      let invoices = await getInvoices();

      // Apply filters
      if (dateFrom) {
        const fromStr = dateFrom.toISOString().split("T")[0];
        invoices = invoices.filter((inv) => inv.invoiceDate >= fromStr);
      }
      if (dateTo) {
        const toStr = dateTo.toISOString().split("T")[0];
        invoices = invoices.filter((inv) => inv.invoiceDate <= toStr);
      }
      if (clientFilter && clientFilter !== "all") {
        invoices = invoices.filter((inv) => inv.clientId === clientFilter);
      }
      if (statusFilter && statusFilter !== "all") {
        invoices = invoices.filter((inv) => inv.status === statusFilter);
      }

      // Sort by date
      invoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));

      if (invoices.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No invoices match the selected filters",
        });
        return;
      }

      let filePath: string;

      if (format === "csv") {
        const csv = generateCSV(invoices);
        const saveBase = resolveSaveLocation(preferences.saveLocation);
        const dir = path.join(saveBase, "Exports");
        fs.mkdirSync(dir, { recursive: true });
        const today = new Date().toISOString().split("T")[0];
        filePath = path.join(dir, `invoices-export-${today}.csv`);
        fs.writeFileSync(filePath, csv, "utf-8");
      } else {
        const fromStr = dateFrom ? dateFrom.toISOString().split("T")[0] : getTaxYearStart().toISOString().split("T")[0];
        const toStr = dateTo ? dateTo.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        filePath = await generatePDFSummary(invoices, preferences, fromStr, toStr);
      }

      await showToast({ style: Toast.Style.Success, title: "Export complete" });

      // Open the exported file
      await open(filePath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Export Invoices"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Export Format" defaultValue="csv">
        <Form.Dropdown.Item value="csv" title="CSV" />
        <Form.Dropdown.Item value="pdf" title="PDF Summary" />
      </Form.Dropdown>

      <Form.DatePicker id="dateFrom" title="Date From" defaultValue={getTaxYearStart()} />
      <Form.DatePicker id="dateTo" title="Date To" defaultValue={new Date()} />

      <Form.Dropdown id="clientFilter" title="Filter by Client" defaultValue="all">
        <Form.Dropdown.Item value="all" title="All Clients" />
        {clients.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="statusFilter" title="Filter by Status" defaultValue="all">
        <Form.Dropdown.Item value="all" title="All Statuses" />
        <Form.Dropdown.Item value="draft" title="Draft" />
        <Form.Dropdown.Item value="sent" title="Sent" />
        <Form.Dropdown.Item value="paid" title="Paid" />
      </Form.Dropdown>
    </Form>
  );
}
