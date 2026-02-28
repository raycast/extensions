/**
 * AssetConfirmation component.
 *
 * Displayed after the user selects a search result. Shows the asset's
 * current price, key details, and a form to specify how many units to add.
 *
 * This is the final step before a position is added to an account.
 * It fetches the live price for the selected asset and displays it
 * alongside a units input field.
 *
 * Flow:
 * 1. User selects a search result → navigates here
 * 2. Asset price is fetched (with loading indicator)
 * 3. User sees price + details and enters number of units
 * 4. User confirms → position is added to the specified account → pops back
 *
 * Features:
 * - Live price fetch with loading state
 * - Asset metadata display (name, symbol, type, exchange, currency)
 * - Computed total value (units × price) shown in real-time
 * - Input validation for units (positive number, max 6 decimal places)
 * - Error handling for price fetch failures
 * - Keyboard-friendly: units field is auto-focused
 *
 * Usage:
 * ```tsx
 * <AssetConfirmation
 *   result={selectedSearchResult}
 *   accountId="abc-123"
 *   accountName="Vanguard ISA"
 *   onConfirm={async (params) => { await addPosition(accountId, params); }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Detail, Icon, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import { AssetSearchResult, AssetType } from "../utils/types";
import { useAssetPrice } from "../hooks/useAssetPrice";
import { validateUnits, parseUnits, validateAssetName, validatePrice } from "../utils/validation";
import { formatCurrency, formatPercent } from "../utils/formatting";
import { ASSET_TYPE_LABELS } from "../utils/constants";
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_NEUTRAL, COLOR_PRIMARY } from "../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AssetConfirmationProps {
  /** The search result that the user selected */
  result: AssetSearchResult;

  /** The ID of the account to add the position to */
  accountId: string;

  /** The name of the target account (for display purposes) */
  accountName: string;

  /**
   * Callback fired when the user confirms the addition.
   * Receives all data needed to create a new Position.
   */
  onConfirm: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
    priceOverride?: number;
  }) => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Confirmation view for adding a new position to an account.
 *
 * Uses the Detail view to display asset information and a Form
 * for units input. The two are combined using Detail with metadata
 * for the asset info and an ActionPanel for the confirm action.
 */
export function AssetConfirmation({
  result,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountId,
  accountName,
  onConfirm,
}: AssetConfirmationProps): React.JSX.Element {
  const { pop } = useNavigation();
  const { price, isLoading: isPriceLoading, error: priceError } = useAssetPrice(result.symbol);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- WIP: Detail variant doesn't yet have embedded form fields
  const [unitsInput, _setUnitsInput] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- set in handleSubmit but not rendered in Detail variant yet
  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Computed Values ──

  /** The parsed units value, or 0 if input is invalid */
  const parsedUnits = useMemo(() => {
    const validation = validateUnits(unitsInput);
    if (validation) return 0;
    return parseUnits(unitsInput);
  }, [unitsInput]);

  /** Estimated total value = units × current price */
  const estimatedTotal = useMemo(() => {
    if (!price || parsedUnits <= 0) return 0;
    return parsedUnits * price.price;
  }, [price, parsedUnits]);

  /** Colour for the price change indicator */
  const changeColor = !price
    ? COLOR_NEUTRAL
    : price.change > 0
      ? COLOR_POSITIVE
      : price.change < 0
        ? COLOR_NEGATIVE
        : COLOR_NEUTRAL;

  // ── Handlers ──

  async function handleSubmit() {
    // Validate units
    const unitValidation = validateUnits(unitsInput);
    if (unitValidation) {
      setUnitsError(unitValidation);
      return;
    }

    // Ensure price data is available
    if (!price) {
      setUnitsError("Waiting for price data. Please try again in a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm({
        symbol: result.symbol,
        name: price.name || result.name,
        units: parsedUnits,
        currency: price.currency,
        assetType: result.type,
      });
      pop();
    } catch (error) {
      console.error("AssetConfirmation submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Error State ──

  if (priceError && !price) {
    return (
      <Detail
        navigationTitle={`Add ${result.name}`}
        markdown={buildErrorMarkdown(result, priceError.message)}
        actions={
          <ActionPanel>
            <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  // ── Main Render ──

  const typeLabel = ASSET_TYPE_LABELS[result.type] ?? "Unknown";

  // Build markdown content for the Detail view
  const markdown = buildAssetMarkdown(result, price, isPriceLoading);

  return (
    <Detail
      navigationTitle={`Add ${result.name}`}
      isLoading={isPriceLoading || isSubmitting}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* ── Asset Info ── */}
          <Detail.Metadata.Label title="Symbol" text={result.symbol} />
          <Detail.Metadata.Label title="Type" text={typeLabel} />
          <Detail.Metadata.Label title="Exchange" text={result.exchange} />

          {price && (
            <>
              <Detail.Metadata.Separator />

              {/* ── Price Info ── */}
              <Detail.Metadata.Label title="Current Price" text={formatCurrency(price.price, price.currency)} />
              <Detail.Metadata.Label title="Currency" text={price.currency} />
              <Detail.Metadata.TagList title="Day Change">
                <Detail.Metadata.TagList.Item
                  text={`${formatCurrency(price.change, price.currency, { showSign: true })} (${formatPercent(price.changePercent)})`}
                  color={changeColor}
                />
              </Detail.Metadata.TagList>
            </>
          )}

          <Detail.Metadata.Separator />

          {/* ── Position Details ── */}
          <Detail.Metadata.Label title="Account" text={accountName} />

          {parsedUnits > 0 && price && (
            <>
              <Detail.Metadata.Label title="Units" text={String(parsedUnits)} />
              <Detail.Metadata.TagList title="Estimated Value">
                <Detail.Metadata.TagList.Item
                  text={formatCurrency(estimatedTotal, price.currency)}
                  color={COLOR_PRIMARY}
                />
              </Detail.Metadata.TagList>
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Add Position">
            <Action title="Confirm & Add Position" icon={Icon.PlusCircle} onAction={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "[" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ──────────────────────────────────────────
// Units Input Sub-Component
//
// Note: Raycast's Detail view doesn't support embedded Form fields.
// The units input is handled via the ActionPanel's submit action
// combined with a text prompt in the markdown content.
// We use a Form-based approach instead when the price is loaded.
// ──────────────────────────────────────────

/**
 * Form-based variant of the AssetConfirmation for units input.
 *
 * Since Raycast's Detail view cannot contain Form fields, we provide
 * this alternative component that uses a Form layout instead.
 * This is the version used in the actual navigation flow.
 */
export function AssetConfirmationForm({
  result,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountId,
  accountName,
  onConfirm,
}: AssetConfirmationProps): React.JSX.Element {
  const { pop } = useNavigation();
  const { price, isLoading: isPriceLoading, error: priceError } = useAssetPrice(result.symbol);

  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [priceOverrideError, setPriceOverrideError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ──

  function handleUnitsBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      const error = validateUnits(event.target.value);
      setUnitsError(error);
    }
  }

  function handleUnitsChange() {
    if (unitsError) {
      setUnitsError(undefined);
    }
  }

  function handleNameBlur(event: Form.Event<string>) {
    const error = validateAssetName(event.target.value);
    setNameError(error);
  }

  function handleNameChange() {
    if (nameError) {
      setNameError(undefined);
    }
  }

  function handlePriceBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      const error = validatePrice(event.target.value);
      setPriceOverrideError(error);
    }
  }

  function handlePriceChange() {
    if (priceOverrideError) {
      setPriceOverrideError(undefined);
    }
  }

  async function handleSubmit(values: { name: string; units: string; priceOverride?: string }) {
    const nameValidation = validateAssetName(values.name);
    if (nameValidation) {
      setNameError(nameValidation);
      return;
    }

    const unitValidation = validateUnits(values.units);
    if (unitValidation) {
      setUnitsError(unitValidation);
      return;
    }

    const priceOverrideValue = values.priceOverride?.trim();
    if (priceOverrideValue) {
      const priceValidation = validatePrice(priceOverrideValue);
      if (priceValidation) {
        setPriceOverrideError(priceValidation);
        return;
      }
    }

    if (!price) {
      setUnitsError("Price data not yet available. Please wait a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm({
        symbol: result.symbol,
        name: values.name.trim(),
        units: parseUnits(values.units),
        currency: price.currency,
        assetType: result.type,
        priceOverride: priceOverrideValue ? parseUnits(priceOverrideValue) : undefined,
      });
      pop();
    } catch (error) {
      console.error("AssetConfirmationForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Computed display values ──

  const typeLabel = ASSET_TYPE_LABELS[result.type] ?? "Unknown";
  const priceDisplay = price
    ? formatCurrency(price.price, price.currency)
    : isPriceLoading
      ? "Loading..."
      : "Unavailable";

  const changeDisplay = price
    ? `${formatCurrency(price.change, price.currency, { showSign: true })} (${formatPercent(price.changePercent)})`
    : "";

  // ── Render ──

  return (
    <Form
      navigationTitle={`Add ${result.name}`}
      isLoading={isPriceLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Portfolio" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    >
      {/* ── Asset Information (read-only) ── */}
      <Form.Description title="Asset" text={result.name} />
      <Form.Description title="Symbol" text={result.symbol} />
      <Form.Description title="Type" text={`${typeLabel} · ${result.exchange}`} />
      <Form.Description title="Price" text={priceDisplay} />

      {price && price.change !== 0 && <Form.Description title="Day Change" text={changeDisplay} />}

      {priceError && <Form.Description title="⚠️ Warning" text={`Price data may be stale: ${priceError.message}`} />}

      <Form.Separator />

      {/* ── Editable Asset Fields ── */}
      <Form.TextField
        id="name"
        title="Asset Name"
        defaultValue={price?.name ?? result.name}
        error={nameError}
        onChange={handleNameChange}
        onBlur={handleNameBlur}
      />

      <Form.TextField
        id="priceOverride"
        title="Price per Unit"
        placeholder={price ? formatCurrency(price.price, price.currency) : "e.g. 72.50"}
        error={priceOverrideError}
        onChange={handlePriceChange}
        onBlur={handlePriceBlur}
      />

      <Form.Description
        title=""
        text={
          price
            ? `Leave blank to use the live price (${formatCurrency(price.price, price.currency)}).`
            : "Enter a price per unit (optional)."
        }
      />

      {/* ── Units Input ── */}
      <Form.Description title="Account" text={accountName} />

      <Form.TextField
        id="units"
        title="Number of Units"
        placeholder="e.g. 50, 12.5, 0.25"
        error={unitsError}
        onChange={handleUnitsChange}
        onBlur={handleUnitsBlur}
        autoFocus
      />

      <Form.Description
        title=""
        text={
          price
            ? `Each unit is currently worth ${formatCurrency(price.price, price.currency)}`
            : "Enter the number of units (shares) you hold."
        }
      />
    </Form>
  );
}

// ──────────────────────────────────────────
// Markdown Builders
// ──────────────────────────────────────────

/**
 * Builds the markdown content for the asset detail view.
 */
function buildAssetMarkdown(
  result: AssetSearchResult,
  price: { price: number; currency: string; name: string; change: number; changePercent: number } | undefined,
  isLoading: boolean,
): string {
  const lines: string[] = [];

  lines.push(`# ${result.name}`);
  lines.push("");
  lines.push(`**${result.symbol}** · ${ASSET_TYPE_LABELS[result.type] ?? "Unknown"} · ${result.exchange}`);
  lines.push("");

  if (isLoading) {
    lines.push("*Fetching current price...*");
  } else if (price) {
    lines.push(`## ${formatCurrency(price.price, price.currency)}`);
    lines.push("");

    const changeSign = price.change >= 0 ? "+" : "";
    lines.push(
      `${changeSign}${formatCurrency(price.change, price.currency)} (${formatPercent(price.changePercent)}) today`,
    );
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(
      "Use the **Confirm & Add Position** action to specify the number of units and add this to your portfolio.",
    );
  } else {
    lines.push("*Price data unavailable*");
  }

  return lines.join("\n");
}

/**
 * Builds the error markdown content when price fetching fails.
 */
function buildErrorMarkdown(result: AssetSearchResult, errorMessage: string): string {
  const lines: string[] = [];

  lines.push(`# ${result.name}`);
  lines.push("");
  lines.push(`**${result.symbol}** · ${result.exchange}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`⚠️ **Unable to fetch price data**`);
  lines.push("");
  lines.push(errorMessage);
  lines.push("");
  lines.push("Please check your internet connection and try again.");

  return lines.join("\n");
}
