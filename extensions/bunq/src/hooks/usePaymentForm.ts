/**
 * Shared hook for payment form state and validation.
 */

import { useState, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { DEFAULT_CURRENCY } from "../lib/constants";
import { formatCurrency, detectPointerType } from "../lib/formatters";
import type { Amount, Pointer } from "../api/schemas";
import type { MonetaryAccount } from "../api/endpoints";

/**
 * Payment form field values.
 */
export interface PaymentFormValues {
  selectedAccountId: string;
  amount: string;
  recipient: string;
  recipientName: string;
  description: string;
}

/**
 * Validated payment data ready for API submission.
 */
export interface ValidatedPaymentData {
  accountId: number;
  amount: Amount;
  counterpartyAlias: Pointer;
  description: string;
  formattedAmount: string;
  selectedAccount?: MonetaryAccount;
}

/**
 * Result of form validation.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: ValidatedPaymentData;
}

/**
 * Hook for managing payment form state and validation.
 */
export function usePaymentForm(accounts?: MonetaryAccount[]) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const values: PaymentFormValues = {
    selectedAccountId,
    amount,
    recipient,
    recipientName,
    description,
  };

  const setters = {
    setSelectedAccountId,
    setAmount,
    setRecipient,
    setRecipientName,
    setDescription,
  };

  const reset = useCallback(() => {
    setSelectedAccountId("");
    setAmount("");
    setRecipient("");
    setRecipientName("");
    setDescription("");
  }, []);

  const validate = useCallback(
    (options?: { requireDescription?: boolean }): ValidationResult => {
      const requireDescription = options?.requireDescription ?? true;

      if (!selectedAccountId) {
        return { isValid: false, error: "Please select an account" };
      }

      if (!amount) {
        return { isValid: false, error: "Please enter an amount" };
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { isValid: false, error: "Invalid amount" };
      }

      if (!recipient) {
        return { isValid: false, error: "Please enter a recipient" };
      }

      if (requireDescription && !description) {
        return { isValid: false, error: "Please enter a description" };
      }

      const selectedAccount = accounts?.find((a) => a.id.toString() === selectedAccountId);

      return {
        isValid: true,
        data: {
          accountId: parseInt(selectedAccountId, 10),
          amount: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
          counterpartyAlias: {
            type: detectPointerType(recipient),
            value: recipient.trim(),
            ...(recipientName.trim() ? { name: recipientName.trim() } : {}),
          },
          description: description.trim(),
          formattedAmount: formatCurrency(amount, DEFAULT_CURRENCY),
          ...(selectedAccount ? { selectedAccount } : {}),
        },
      };
    },
    [selectedAccountId, amount, recipient, recipientName, description, accounts],
  );

  const validateAndShowError = useCallback(
    async (options?: { requireDescription?: boolean }): Promise<ValidatedPaymentData | null> => {
      const result = validate(options);

      if (!result.isValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing fields",
          ...(result.error ? { message: result.error } : {}),
        });
        return null;
      }

      return result.data ?? null;
    },
    [validate],
  );

  return {
    values,
    setters,
    isSubmitting,
    setIsSubmitting,
    validate,
    validateAndShowError,
    reset,
  };
}

/**
 * Hook for managing form submission with loading state and error handling.
 */
export function useFormSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async <T>(options: {
      action: () => Promise<T>;
      loadingMessage: string;
      successMessage: string;
      errorTitle: string;
      onSuccess?: (result: T) => Promise<void> | void;
    }): Promise<T | null> => {
      setIsSubmitting(true);

      try {
        await showToast({ style: Toast.Style.Animated, title: options.loadingMessage });
        const result = await options.action();
        await showToast({ style: Toast.Style.Success, title: options.successMessage });

        if (options.onSuccess) {
          await options.onSuccess(result);
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showToast({ style: Toast.Style.Failure, title: options.errorTitle, message });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { isSubmitting, setIsSubmitting, submit };
}
