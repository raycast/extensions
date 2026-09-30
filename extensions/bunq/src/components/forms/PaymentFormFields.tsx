/**
 * Shared form field components for payment forms.
 */

import { Form } from "@raycast/api";
import { AccountFormDropdown } from "../AccountDropdown";
import type { MonetaryAccount } from "../../api/endpoints";
import type { PaymentFormValues } from "../../hooks/usePaymentForm";

/**
 * Props for the PaymentFormFields component.
 */
interface PaymentFormFieldsProps {
  /** Current form values */
  values: PaymentFormValues;
  /** Setter functions for form values */
  setters: {
    setSelectedAccountId: (value: string) => void;
    setAmount: (value: string) => void;
    setRecipient: (value: string) => void;
    setRecipientName: (value: string) => void;
    setDescription: (value: string) => void;
  };
  /** Available accounts */
  accounts?: MonetaryAccount[];
  /** Custom labels for form fields */
  labels?: {
    account?: string;
    amount?: string;
    recipient?: string;
    recipientName?: string;
    description?: string;
  };
  /** Custom placeholders for form fields */
  placeholders?: {
    amount?: string;
    recipient?: string;
    recipientName?: string;
    description?: string;
  };
  /** Whether to show the recipient name field */
  showRecipientName?: boolean;
  /** Whether the description field is optional */
  descriptionOptional?: boolean;
}

/**
 * Shared form fields for payment-related forms.
 * Includes account dropdown, amount, recipient, and description fields.
 */
export function PaymentFormFields({
  values,
  setters,
  accounts,
  labels = {},
  placeholders = {},
  showRecipientName = true,
  descriptionOptional = false,
}: PaymentFormFieldsProps) {
  const defaultLabels = {
    account: "Account",
    amount: "Amount (EUR)",
    recipient: "Recipient",
    recipientName: "Recipient Name",
    description: "Description",
  };

  const defaultPlaceholders = {
    amount: "10.00",
    recipient: "IBAN, email, or phone number",
    recipientName: "Optional",
    description: "Payment description",
  };

  const mergedLabels = { ...defaultLabels, ...labels };
  const mergedPlaceholders = { ...defaultPlaceholders, ...placeholders };

  return (
    <>
      <AccountFormDropdown
        id="account"
        title={mergedLabels.account}
        value={values.selectedAccountId}
        onChange={setters.setSelectedAccountId}
        accounts={accounts}
      />
      <Form.TextField
        id="amount"
        title={mergedLabels.amount}
        placeholder={mergedPlaceholders.amount}
        value={values.amount}
        onChange={setters.setAmount}
      />
      <Form.TextField
        id="recipient"
        title={mergedLabels.recipient}
        placeholder={mergedPlaceholders.recipient}
        value={values.recipient}
        onChange={setters.setRecipient}
      />
      {showRecipientName && (
        <Form.TextField
          id="recipientName"
          title={mergedLabels.recipientName}
          placeholder={mergedPlaceholders.recipientName}
          value={values.recipientName}
          onChange={setters.setRecipientName}
        />
      )}
      <Form.TextField
        id="description"
        title={descriptionOptional ? `${mergedLabels.description} (Optional)` : mergedLabels.description}
        placeholder={mergedPlaceholders.description}
        value={values.description}
        onChange={setters.setDescription}
      />
    </>
  );
}

/**
 * Amount field component for use in custom forms.
 */
export function AmountField({
  value,
  onChange,
  title = "Amount (EUR)",
  placeholder = "10.00",
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
}) {
  return <Form.TextField id="amount" title={title} placeholder={placeholder} value={value} onChange={onChange} />;
}

/**
 * Recipient field component for use in custom forms.
 */
export function RecipientField({
  value,
  onChange,
  title = "Recipient",
  placeholder = "IBAN, email, or phone number",
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
}) {
  return <Form.TextField id="recipient" title={title} placeholder={placeholder} value={value} onChange={onChange} />;
}

/**
 * Description field component for use in custom forms.
 */
export function DescriptionField({
  value,
  onChange,
  title = "Description",
  placeholder = "Payment description",
  optional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <Form.TextField
      id="description"
      title={optional ? `${title} (Optional)` : title}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}
