/**
 * FireContributions component — manage recurring monthly contributions.
 *
 * Uses single-frame rendering to switch between multiple phases within one
 * component, keeping the navigation stack stable:
 *
 *   Phase "list" — Shows existing contributions as a List with:
 *     - Each contribution row: amount, position name, account name
 *     - "Add Contribution" action → switches to "add" phase
 *     - "Remove Contribution" action with confirmation
 *     - "Done" action → calls onDone to pop back to dashboard
 *
 *   Phase "add" — Shows a Form to create a new contribution:
 *     - Monthly Amount text field
 *     - Position picker (dropdown of positions in included accounts only)
 *     - Submit → adds contribution, switches back to "list" phase
 *     - Cancel → switches back to "list" phase without saving
 *
 *   Phase "edit" — Shows a Form to update an existing contribution:
 *     - Pre-filled amount + position
 *     - Submit → updates contribution, switches back to "list" phase
 *     - Cancel → switches back to "list" phase without saving
 *
 * The component never modifies portfolio data. It only reads portfolio
 * accounts/positions for the picker and writes contribution entries
 * into the FIRE settings via the onSave callback.
 *
 * Usage (pushed from FireDashboard):
 * ```tsx
 * push(
 *   <FireContributions
 *     contributions={settings.contributions}
 *     accounts={includedAccounts}
 *     baseCurrency="GBP"
 *     onSave={async (contributions) => { ... }}
 *     onDone={() => { pop(); revalidate(); }}
 *   />
 * );
 * ```
 */

import React from "react";
import { useState, useMemo } from "react";
import { List, Form, ActionPanel, Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { Account } from "../utils/types";
import { FireContribution } from "../utils/fire-types";
import { getDisplayName } from "../utils/formatting";
import { generateId } from "../utils/uuid";
import { COLOR_DESTRUCTIVE, COLOR_PRIMARY } from "../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface FireContributionsProps {
  /** Current list of contributions from FIRE settings */
  contributions: FireContribution[];

  /**
   * Accounts included in the FIRE calculation (excludes excluded accounts).
   * Only positions within these accounts are available in the picker.
   */
  accounts: Account[];

  /** User's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * Callback to persist the updated contributions array.
   * The parent merges this into FireSettings and saves.
   */
  onSave: (contributions: FireContribution[]) => Promise<void>;

  /**
   * Callback to signal completion — typically pops the nav stack.
   * Called when the user explicitly chooses "Done" / "Show Projection".
   */
  onDone: () => void;

  /**
   * Label for the primary completion action button.
   * Defaults to "Done". Use "Show Projection" for the onboarding flow.
   */
  doneTitle?: string;
}

// ──────────────────────────────────────────
// Phase Type
// ──────────────────────────────────────────

type Phase = "list" | "add" | "edit";

// ──────────────────────────────────────────
// Currency Symbols (local, no Raycast Color import dependency)
// ──────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CHF: "Fr",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function FireContributions({
  contributions,
  accounts,
  baseCurrency,
  onSave,
  onDone,
  doneTitle = "Done",
}: FireContributionsProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localContributions, setLocalContributions] = useState<FireContribution[]>(contributions);
  const [isSaving, setIsSaving] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;

  // ── Build a lookup of positionId → display info ──

  const positionLookup = useMemo(() => {
    const lookup: Record<string, { displayName: string; symbol: string; accountName: string; accountId: string }> = {};

    for (const account of accounts) {
      for (const position of account.positions) {
        lookup[position.id] = {
          displayName: getDisplayName(position),
          symbol: position.symbol,
          accountName: account.name,
          accountId: account.id,
        };
      }
    }

    return lookup;
  }, [accounts]);

  // ── Build picker options (all positions in included accounts) ──

  const positionOptions = useMemo(() => {
    const options: Array<{
      value: string;
      title: string;
      accountId: string;
      accountName: string;
    }> = [];

    for (const account of accounts) {
      for (const position of account.positions) {
        const displayName = getDisplayName(position);
        options.push({
          value: position.id,
          title: `${position.symbol} — ${displayName} (${account.name})`,
          accountId: account.id,
          accountName: account.name,
        });
      }
    }

    return options;
  }, [accounts]);

  const validPositionIds = useMemo(() => new Set(positionOptions.map((opt) => opt.value)), [positionOptions]);

  // ── Handlers ──

  async function handleAdd(values: { monthlyAmount: string; positionId: string }) {
    // Validate amount
    const amount = Number(values.monthlyAmount.trim());
    if (isNaN(amount) || amount <= 0) {
      return; // Form validation should catch this, but guard anyway
    }

    // Validate position selection
    if (!values.positionId) {
      return;
    }

    // Resolve the account ID from the position
    const positionInfo = positionLookup[values.positionId];
    if (!positionInfo) {
      return;
    }

    const newContribution: FireContribution = {
      id: generateId(),
      positionId: values.positionId,
      accountId: positionInfo.accountId,
      monthlyAmount: amount,
    };

    const updated = [...localContributions, newContribution];

    setIsSaving(true);
    try {
      await onSave(updated);
      setLocalContributions(updated);
      setPhase("list");
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save contribution:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(contributionId: string) {
    setEditingId(contributionId);
    setPhase("edit");
  }

  async function handleUpdate(values: { monthlyAmount: string; positionId: string }) {
    if (!editingId) return;

    const amount = Number(values.monthlyAmount.trim());
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (!values.positionId) {
      return;
    }

    const positionInfo = positionLookup[values.positionId];
    if (!positionInfo) {
      return;
    }

    const updated = localContributions.map((c) =>
      c.id === editingId
        ? {
            ...c,
            positionId: values.positionId,
            accountId: positionInfo.accountId,
            monthlyAmount: amount,
          }
        : c,
    );

    setIsSaving(true);
    try {
      await onSave(updated);
      setLocalContributions(updated);
      setPhase("list");
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update contribution:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(contributionId: string) {
    const contribution = localContributions.find((c) => c.id === contributionId);
    if (!contribution) return;

    const info = positionLookup[contribution.positionId];
    const label = info
      ? `${currencySymbol}${contribution.monthlyAmount}/mo → ${info.symbol}`
      : `${currencySymbol}${contribution.monthlyAmount}/mo`;

    const confirmed = await confirmAlert({
      title: "Remove Contribution?",
      message: `Remove ${label} from your monthly contributions?`,
      icon: { source: Icon.Trash, tintColor: COLOR_DESTRUCTIVE },
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    const updated = localContributions.filter((c) => c.id !== contributionId);

    setIsSaving(true);
    try {
      await onSave(updated);
      setLocalContributions(updated);
    } catch (error) {
      console.error("Failed to remove contribution:", error);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Phase: Add Form ──

  const editingContribution = editingId ? localContributions.find((c) => c.id === editingId) : undefined;

  if (phase === "add") {
    return (
      <AddContributionForm
        title="Add Contribution"
        submitTitle="Add Contribution"
        submitIcon={Icon.Plus}
        descriptionText="Add a recurring monthly contribution to a position."
        positionOptions={positionOptions}
        currencySymbol={currencySymbol}
        isSaving={isSaving}
        onSubmit={handleAdd}
        onCancel={() => {
          setPhase("list");
          setEditingId(null);
        }}
      />
    );
  }

  if (phase === "edit" && editingContribution) {
    return (
      <AddContributionForm
        title="Edit Contribution"
        submitTitle="Save Changes"
        submitIcon={Icon.Pencil}
        descriptionText="Edit the amount or target position."
        positionOptions={positionOptions}
        currencySymbol={currencySymbol}
        isSaving={isSaving}
        initialMonthlyAmount={String(editingContribution.monthlyAmount)}
        initialPositionId={
          validPositionIds.has(editingContribution.positionId) ? editingContribution.positionId : undefined
        }
        onSubmit={handleUpdate}
        onCancel={() => {
          setPhase("list");
          setEditingId(null);
        }}
      />
    );
  }

  // ── Phase: List ──

  const totalMonthly = localContributions.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const hasContributions = localContributions.length > 0;
  const hasPositions = positionOptions.length > 0;

  return (
    <List navigationTitle="Monthly Contributions" isLoading={isSaving} searchBarPlaceholder="Filter contributions...">
      {/* ── Empty State ── */}
      {!hasContributions && (
        <List.EmptyView
          icon={Icon.BankNote}
          title="No Contributions Yet"
          description={
            hasPositions
              ? "Add recurring monthly contributions to model how your portfolio will grow over time."
              : "Add positions to your portfolio first, then configure contributions here."
          }
          actions={
            <ActionPanel>
              {hasPositions && (
                <Action
                  title="Add Contribution"
                  icon={Icon.Plus}
                  onAction={() => {
                    setEditingId(null);
                    setPhase("add");
                  }}
                />
              )}
              <Action
                title={doneTitle}
                icon={doneTitle === "Done" ? Icon.Checkmark : Icon.LineChart}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={onDone}
              />
            </ActionPanel>
          }
        />
      )}

      {/* ── Contribution Rows ── */}
      {hasContributions && (
        <List.Section
          title="Monthly Contributions"
          subtitle={`${currencySymbol}${totalMonthly.toLocaleString("en", { maximumFractionDigits: 0 })}/mo · ${currencySymbol}${(totalMonthly * 12).toLocaleString("en", { maximumFractionDigits: 0 })}/yr`}
        >
          {localContributions.map((contribution) => {
            const info = positionLookup[contribution.positionId];
            const title = info
              ? `${currencySymbol}${contribution.monthlyAmount.toLocaleString("en", { maximumFractionDigits: 0 })}/mo`
              : `${currencySymbol}${contribution.monthlyAmount.toLocaleString("en", { maximumFractionDigits: 0 })}/mo (orphaned)`;

            const subtitle = info ? `→ ${info.symbol} · ${info.displayName}` : "Position no longer exists";

            const accountTag = info?.accountName ?? "Unknown";

            return (
              <List.Item
                key={contribution.id}
                icon={{
                  source: info ? Icon.ArrowRight : Icon.ExclamationMark,
                  tintColor: info ? COLOR_PRIMARY : COLOR_DESTRUCTIVE,
                }}
                title={title}
                subtitle={subtitle}
                accessories={[
                  {
                    tag: { value: accountTag, color: info ? COLOR_PRIMARY : COLOR_DESTRUCTIVE },
                    tooltip: info ? `Account: ${accountTag}` : "Position was deleted from portfolio",
                  },
                  {
                    text: `${currencySymbol}${(contribution.monthlyAmount * 12).toLocaleString("en", { maximumFractionDigits: 0 })}/yr`,
                    tooltip: "Annual contribution",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Contributions">
                      {hasPositions && (
                        <Action
                          title="Add Contribution"
                          icon={Icon.Plus}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                          onAction={() => {
                            setEditingId(null);
                            setPhase("add");
                          }}
                        />
                      )}
                      <Action
                        title="Edit Contribution"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => handleEdit(contribution.id)}
                      />
                      <Action
                        title="Remove Contribution"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => handleRemove(contribution.id)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title={doneTitle}
                        icon={doneTitle === "Done" ? Icon.Checkmark : Icon.LineChart}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={onDone}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

// ──────────────────────────────────────────
// Add Contribution Sub-Form
// ──────────────────────────────────────────

interface AddContributionFormProps {
  title: string;
  submitTitle: string;
  submitIcon: Icon;
  descriptionText: string;
  positionOptions: Array<{
    value: string;
    title: string;
    accountId: string;
    accountName: string;
  }>;
  currencySymbol: string;
  isSaving: boolean;
  initialMonthlyAmount?: string;
  initialPositionId?: string;
  onSubmit: (values: { monthlyAmount: string; positionId: string }) => Promise<void>;
  onCancel: () => void;
}

/**
 * Inline form for adding a new contribution.
 *
 * Rendered within the same component tree (single-frame rendering)
 * to keep the navigation stack stable.
 */
function AddContributionForm({
  title,
  submitTitle,
  submitIcon,
  descriptionText,
  positionOptions,
  currencySymbol,
  isSaving,
  initialMonthlyAmount,
  initialPositionId,
  onSubmit,
  onCancel,
}: AddContributionFormProps): React.JSX.Element {
  const [amountError, setAmountError] = useState<string | undefined>();
  const [positionError, setPositionError] = useState<string | undefined>();

  function validateAmount(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "Monthly amount is required";
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num <= 0) return "Amount must be greater than zero";
    if (num > 1_000_000) return "Amount seems too large — please check your input";
    return undefined;
  }

  function handleFormSubmit(values: { monthlyAmount: string; positionId: string }) {
    // Validate amount
    const amtError = validateAmount(values.monthlyAmount);
    if (amtError) {
      setAmountError(amtError);
      return;
    }

    // Validate position selection
    if (!values.positionId || values.positionId.trim().length === 0) {
      setPositionError("Please select a position");
      return;
    }

    onSubmit(values);
  }

  // Group positions by account for a cleaner dropdown
  const accountGroups = useMemo(() => {
    const groups: Record<string, Array<{ value: string; title: string }>> = {};
    for (const opt of positionOptions) {
      if (!groups[opt.accountName]) {
        groups[opt.accountName] = [];
      }
      groups[opt.accountName].push({ value: opt.value, title: opt.title });
    }
    return groups;
  }, [positionOptions]);

  return (
    <Form
      navigationTitle={title}
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={submitIcon} onSubmit={handleFormSubmit} />
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={onCancel}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={title} text={descriptionText} />

      <Form.TextField
        id="monthlyAmount"
        title={`Monthly Amount (${currencySymbol})`}
        placeholder="e.g. 500"
        error={amountError}
        onChange={() => amountError && setAmountError(undefined)}
        autoFocus
        defaultValue={initialMonthlyAmount ?? ""}
        info="The amount you invest into this position every month."
      />

      <Form.Dropdown
        id="positionId"
        title="Position"
        error={positionError}
        onChange={() => positionError && setPositionError(undefined)}
        defaultValue={initialPositionId ?? ""}
        info="The portfolio position that receives this monthly contribution."
      >
        {Object.entries(accountGroups).map(([accountName, positions]) => (
          <Form.Dropdown.Section key={accountName} title={accountName}>
            {positions.map((pos) => (
              <Form.Dropdown.Item key={pos.value} value={pos.value} title={pos.title} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}
