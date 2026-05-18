/**
 * AccountForm component.
 *
 * A Raycast Form view for creating new investment accounts or editing existing ones.
 * Supports both "create" and "edit" modes, determined by whether an `account` prop is provided.
 *
 * Features:
 * - Account name text field with validation
 * - Account type dropdown (ISA, SIPP, GIA, Brokerage, etc.)
 * - Pre-populated fields when editing an existing account
 * - Validation feedback on submission
 * - Toast notifications on success
 *
 * Usage:
 * ```tsx
 * // Create mode
 * <AccountForm onSubmit={handleCreate} />
 *
 * // Edit mode
 * <AccountForm account={existingAccount} onSubmit={handleEdit} />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Account, AccountType } from "../utils/types";
import { ACCOUNT_TYPE_OPTIONS } from "../utils/constants";
import { validateAccountName } from "../utils/validation";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AccountFormProps {
  /**
   * Existing account to edit. When provided, the form enters "edit" mode
   * with fields pre-populated. When omitted, the form enters "create" mode.
   */
  account?: Account;

  /**
   * Callback fired when the form is submitted with valid data.
   *
   * @param name - The trimmed account name
   * @param type - The selected account type
   */
  onSubmit: (name: string, type: AccountType) => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Form for creating or editing an investment account.
 *
 * Renders a Raycast Form with:
 * - A text field for the account name (e.g. "Vanguard ISA")
 * - A dropdown for the account type (ISA, SIPP, GIA, etc.)
 * - A submit action that validates and calls `onSubmit`
 *
 * On successful submission, the form automatically navigates back (pops).
 */
export function AccountForm({ account, onSubmit }: AccountFormProps): React.JSX.Element {
  const { pop } = useNavigation();

  const isEditing = !!account;

  // ── Form State ──

  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Validation ──

  /**
   * Validates the account name on blur (when the user tabs away from the field).
   * Clears the error immediately when the user starts typing again.
   */
  function handleNameBlur(event: Form.Event<string>) {
    const error = validateAccountName(event.target.value);
    setNameError(error);
  }

  function handleNameChange() {
    // Clear error as soon as the user starts typing
    if (nameError) {
      setNameError(undefined);
    }
  }

  // ── Submission ──

  async function handleSubmit(values: { accountName: string; accountType: string }) {
    // Validate before submitting
    const nameValidation = validateAccountName(values.accountName);
    if (nameValidation) {
      setNameError(nameValidation);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values.accountName.trim(), values.accountType as AccountType);
      pop();
    } catch (error) {
      // Error handling is done by the parent via showToast in the hook
      console.error("AccountForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={isEditing ? "Edit Account" : "Add Account"}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Create Account"}
            icon={isEditing ? Icon.Check : Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="accountName"
        title="Account Name"
        placeholder="e.g. Vanguard ISA, Trading212, Fidelity SIPP"
        defaultValue={account?.name ?? ""}
        error={nameError}
        onChange={handleNameChange}
        onBlur={handleNameBlur}
        autoFocus
      />

      <Form.Dropdown id="accountType" title="Account Type" defaultValue={account?.type ?? AccountType.GIA}>
        {ACCOUNT_TYPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Description
        title=""
        text={
          isEditing
            ? "Update the account name or type. Positions within the account are not affected."
            : "Create a new investment account to hold your positions. You can add stocks, ETFs, and funds to it afterwards."
        }
      />
    </Form>
  );
}
