import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeagent } from "./oauth";
import { getAccessToken } from "@raycast/utils";

interface Preferences {
  default_payment_terms_in_days: string;
}

interface Contact {
  url: string;
  first_name?: string;
  last_name?: string;
  organisation_name?: string;
  email?: string;
  phone_number?: string;
  contact_name_on_invoices: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

type InvoiceFormValues = {
  contact: string;
  dated_on: Date;
  payment_terms_in_days: string;
  reference?: string;
  send_new_invoice_emails: boolean;
};

const CreateNewInvoice = function Command() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { token } = getAccessToken();
        if (token) {
          await fetchContacts(token);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Not authenticated",
            message: "Please authenticate with FreeAgent to create invoices.",
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

  async function fetchContacts(accessToken: string) {
    try {
      const response = await fetch("https://api.freeagent.com/v2/contacts?view=active", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Raycast FreeAgent Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { contacts: Contact[] };
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch contacts",
        message: String(error),
      });
    }
  }

  function getContactDisplayName(contact: Contact): string {
    if (contact.organisation_name) {
      return contact.organisation_name;
    }
    const firstName = contact.first_name || "";
    const lastName = contact.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Unknown Contact";
  }

  async function handleSubmit(values: InvoiceFormValues) {
    try {
      const { token } = getAccessToken();
      if (!token) {
        throw new Error("No access token available");
      }

      const invoiceData = {
        invoice: {
          contact: values.contact,
          dated_on: values.dated_on?.toISOString().split("T")[0],
          payment_terms_in_days: parseFloat(values.payment_terms_in_days) || 30,
          send_new_invoice_emails: values.send_new_invoice_emails || false,
          ...(values.reference && { reference: values.reference }),
        },
      };

      const response = await fetch("https://api.freeagent.com/v2/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Raycast FreeAgent Extension",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Invoice created successfully",
      });
    } catch (error) {
      console.error("Failed to create invoice:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create invoice",
        message: String(error),
      });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Invoice" />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new invoice in FreeAgent" />

      <Form.Dropdown id="contact" title="Contact" placeholder="Select a contact">
        {contacts.map((contact) => (
          <Form.Dropdown.Item key={contact.url} value={contact.url} title={getContactDisplayName(contact)} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker id="dated_on" title="Invoice Date" />
      <Form.TextField
        id="payment_terms_in_days"
        title="Payment Terms in Days"
        defaultValue={preferences.default_payment_terms_in_days}
      />

      <Form.Checkbox
        id="send_new_invoice_emails"
        title="Send New Invoice Emails"
        label="Send email notifications to the contact"
        defaultValue={true}
      />

      <Form.TextField id="reference" title="Reference" placeholder="Optional - Leave blank to use next in sequence" />
    </Form>
  );
};

export default authorizedWithFreeagent(CreateNewInvoice);
