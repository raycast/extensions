import { ActionPanel, Action, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeagent } from "./oauth";
import { getAccessToken } from "@raycast/utils";

interface Invoice {
  id: number;
  reference: string;
  contact: string;
  contact_name: string;
  dated_on: string;
  due_on: string;
  net_value: string;
  status: string;
  long_status: string;
  currency: string;
  exchange_rate: string;
  total_value: string;
  paid_value: string;
  due_value: string;
  url: string;
  involves_sales_tax: boolean;
  is_interim_uk_vat: boolean;
  omit_header: boolean;
  always_show_bic_and_iban: boolean;
  payment_terms_in_days: number;
  paid_on?: string;
  created_at: string;
  updated_at: string;
  send_new_invoice_emails: boolean;
  send_reminder_emails: boolean;
  send_thank_you_emails: boolean;
  bank_account: string;
  payment_methods: Record<string, boolean>;

  // Optional properties that appear in some invoices
  sales_tax_value?: string;
  discount_value?: string;
  discount_percent?: string;
  comments?: string;
  po_reference?: string;
  project?: string;
  show_project_name?: boolean;
  include_timeslips?: string;
}

const ListInvoices = function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{ subdomain: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { token } = getAccessToken();
        if (token) {
          await getCompanyInfo(getAccessToken().token);
          await fetchInvoices(token);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Not authenticated",
            message: "Please authenticate with FreeAgent to view invoices.",
          });
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function getCompanyInfo(accessToken: string) {
    try {
      const response = await fetch("https://api.freeagent.com/v2/company", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Raycast FreeAgent Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCompanyInfo(data.company);
    } catch (error) {
      console.error("Failed to fetch company info:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch company info",
        message: String(error),
      });
    }
  }

  async function fetchInvoices(accessToken: string) {
    try {
      const response = await fetch("https://api.freeagent.com/v2/invoices?sort=-created_at", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Raycast FreeAgent Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { invoices: Invoice[] };
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch invoices",
        message: String(error),
      });
    }
  }

  // Use intl.NumberFormat for formatting currency values
  const formattedValueWithCurrency = (currency: string, value: string) => {
    const formatter = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    });
    return formatter.format(Number(value));
  };

  const mapColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "overdue":
        return Color.Red;
      case "draft":
        return Color.Yellow;
      case "paid":
        return Color.Green;
      case "scheduled to email":
        return Color.Blue;
      case "partially paid":
        return Color.Orange;
      default:
        return Color.SecondaryText;
    }
  };

  // Date from ISO string
  const parseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date;
  };

  const getInvoiceUrl = (invoice: Invoice) => {
    const url = invoice.url;
    // split on / and get the last part
    const id = url.split("/").pop();
    return `https://${companyInfo?.subdomain}.freeagent.com/invoices/${id}`;
  };

  const getContactUrl = (invoice: Invoice) => {
    const url = invoice.contact;
    // split on / and get the last part
    const id = url.split("/").pop();
    return `https://${companyInfo?.subdomain}.freeagent.com/contacts/${id}`;
  };

  return (
    <List isLoading={isLoading}>
      {invoices.map((invoice) => (
        <List.Item
          key={invoice.url}
          icon={Icon.Document}
          title={invoice.reference}
          subtitle={invoice.contact_name}
          accessories={[
            { text: formattedValueWithCurrency(invoice.currency, invoice.net_value) },
            { text: { value: invoice.status, color: mapColor(invoice.status) } },
            { date: parseDate(invoice.dated_on) },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getInvoiceUrl(invoice)} />
              <Action.OpenInBrowser title="View Contact" url={getContactUrl(invoice)} icon={Icon.Person} />
              <Action.CopyToClipboard title="Copy Invoice Reference" content={invoice.reference} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default authorizedWithFreeagent(ListInvoices);
