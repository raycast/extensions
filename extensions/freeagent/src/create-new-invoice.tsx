import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Contact, Preferences, InvoiceFormValues } from "./types";
import { fetchContacts, createInvoice } from "./services/freeagent";
import { getContactDisplayName } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const CreateNewInvoice = function Command() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { isLoading, isAuthenticated, accessToken, handleError } = useFreeAgent();
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadContacts() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const contactList = await fetchContacts(accessToken, "active");
        setContacts(contactList);
      } catch (error) {
        handleError(error, "Failed to fetch contacts");
      }
    }

    loadContacts();
  }, [isAuthenticated, accessToken]);

  async function handleSubmit(values: InvoiceFormValues) {
    if (!accessToken) {
      handleError(new Error("No access token available"), "Failed to create invoice");
      return;
    }

    try {
      const invoiceData = {
        contact: values.contact,
        dated_on: values.dated_on?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
        payment_terms_in_days: parseInt(values.payment_terms_in_days) || 30,
        send_new_invoice_emails: values.send_new_invoice_emails || false,
        ...(values.reference && { reference: values.reference }),
      };

      await createInvoice(accessToken, invoiceData);

      showToast({
        style: Toast.Style.Success,
        title: "Invoice created successfully",
      });
    } catch (error) {
      handleError(error, "Failed to create invoice");
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

export default authorizedWithFreeAgent(CreateNewInvoice);
