import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import InvoiceDetail from "./components/InvoiceDetail";
import { STATUS_COLORS, STATUS_LABELS } from "./lib/constants";
import { formatCurrency, formatInvoiceNumber, isOverdue, buildInvoiceSummary } from "./lib/formatters";
import { generateInvoicePDF } from "./lib/pdf-generator";
import { addInvoice, deleteInvoice, getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from "./lib/storage";
import { Invoice, InvoiceStatus } from "./lib/types";

export default function ListInvoices() {
  const preferences = getPreferenceValues<Preferences>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { push } = useNavigation();

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    const data = await getInvoices();
    // Sort by date descending
    data.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
    setInvoices(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        const data = await getInvoices();
        if (isCancelled) return;
        data.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
        setInvoices(data);
      } catch (err) {
        if (!isCancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load invoices",
            message: String(err),
          });
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    // Start initial load

    fetchInvoices();

    return () => {
      isCancelled = true;
    };
  }, []);

  const years = [...new Set(invoices.map((inv) => inv.invoiceDate.substring(0, 4)))].sort().reverse();

  const filtered = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "draft" || filter === "sent" || filter === "paid") return inv.status === filter;
    // Year filter
    return inv.invoiceDate.startsWith(filter);
  });

  async function handleStatusChange(invoice: Invoice, status: InvoiceStatus) {
    await updateInvoiceStatus(invoice.id, status);
    await showToast({
      style: Toast.Style.Success,
      title: `Marked as ${STATUS_LABELS[status]}`,
    });
    await loadInvoices();
  }

  async function handleDuplicate(invoice: Invoice) {
    try {
      const startingNum = parseInt(preferences.startingInvoiceNumber) || 1;
      const numberRaw = await getNextInvoiceNumber(startingNum);
      const invoiceNumber = formatInvoiceNumber(preferences.invoicePrefix, numberRaw);

      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (parseInt(preferences.paymentTermsDays) || 30));
      const now = new Date().toISOString();

      const newInvoice: Invoice = {
        ...invoice,
        id: uuidv4(),
        invoiceNumber,
        numberRaw,
        invoiceDate: today.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        status: "draft",
        pdfPath: "",
        createdAt: now,
        updatedAt: now,
      };

      const pdfPath = await generateInvoicePDF(newInvoice, preferences);
      newInvoice.pdfPath = pdfPath;
      await addInvoice(newInvoice);
      await showToast({
        style: Toast.Style.Success,
        title: `Duplicated as ${invoiceNumber}`,
      });
      await loadInvoices();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate",
        message: String(error),
      });
    }
  }

  async function handleDelete(invoice: Invoice) {
    if (
      await confirmAlert({
        title: "Delete Invoice",
        message: `Delete ${invoice.invoiceNumber}? This will also delete the PDF file.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteInvoice(invoice.id);
      await showToast({ style: Toast.Style.Success, title: "Invoice deleted" });
      await loadInvoices();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search invoices..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Draft" value="draft" />
            <List.Dropdown.Item title="Sent" value="sent" />
            <List.Dropdown.Item title="Paid" value="paid" />
          </List.Dropdown.Section>
          {years.length > 0 && (
            <List.Dropdown.Section title="Year">
              {years.map((yr) => (
                <List.Dropdown.Item key={yr} title={yr} value={yr} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView title="No Invoices" description="No invoices match the current filters." />
      ) : (
        filtered.map((inv) => (
          <List.Item
            key={inv.id}
            title={`${inv.invoiceNumber} - ${inv.clientName}`}
            subtitle={`${formatCurrency(inv.total)}${inv.vatApplied ? " inc. VAT" : " no VAT"}`}
            keywords={[inv.clientName, inv.invoiceNumber, String(inv.total)]}
            accessories={[
              { date: new Date(inv.invoiceDate) },
              isOverdue(inv)
                ? { tag: { value: "Overdue", color: Color.Red } }
                : {
                    tag: {
                      value: STATUS_LABELS[inv.status],
                      color: STATUS_COLORS[inv.status],
                    },
                  },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open PDF" icon={Icon.Document} onAction={() => open(inv.pdfPath)} />
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => push(<InvoiceDetail invoice={inv} onDuplicate={() => handleDuplicate(inv)} />)}
                />
                <Action
                  title="Open in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() => showInFinder(inv.pdfPath)}
                />
                <Action
                  title="Copy File Path"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(inv.pdfPath);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Path copied",
                    });
                  }}
                />
                <ActionPanel.Section title="Status">
                  {inv.status !== "sent" && (
                    <Action
                      title="Mark as Sent"
                      icon={Icon.Envelope}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => handleStatusChange(inv, "sent")}
                    />
                  )}
                  {inv.status !== "paid" && (
                    <Action
                      title="Mark as Paid"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => handleStatusChange(inv, "paid")}
                    />
                  )}
                  {inv.status !== "draft" && (
                    <Action
                      title="Mark as Draft"
                      icon={Icon.Circle}
                      onAction={() => handleStatusChange(inv, "draft")}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Duplicate Invoice"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDuplicate(inv)}
                  />
                  <Action
                    title="Copy Invoice Summary"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={async () => {
                      await Clipboard.copy(buildInvoiceSummary(inv));
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Summary copied",
                      });
                    }}
                  />
                  <Action
                    title="Delete Invoice"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(inv)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
