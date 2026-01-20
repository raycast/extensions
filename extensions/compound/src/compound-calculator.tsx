import { Form, ActionPanel, Action, showToast, Toast, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import type { Params, Result } from "./types";
import { parseFormInput } from "./parse";
import { calcCompound } from "./calc";
import { formatMoney, toMarkdown, toClipboardText, toCSV } from "./format";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [result, setResult] = useState<{ params: Params; result: Result } | null>(null);

  const defaultTaxRate = preferences.defaultTaxRate || "";
  const defaultCurrency = preferences.defaultCurrency || "USD";
  const defaultFreq = preferences.defaultCompoundFreq || "yearly";
  const defaultRounding = preferences.defaultRounding || "floor";

  async function handleSubmit(values: {
    principal: string;
    rate: string;
    years: string;
    monthly: string;
    freq: "yearly" | "monthly" | "daily";
    afterTax: boolean;
    taxRate: string;
    currency: "JPY" | "USD" | "EUR";
    rounding: "floor" | "round" | "ceil";
  }) {
    try {
      const params = parseFormInput(values);
      const calcResult = calcCompound(params);
      setResult({ params, result: calcResult });
      await showToast({
        style: Toast.Style.Success,
        title: "Calculation Complete",
        message: `Final Amount: ${formatMoney(calcResult.fvBeforeTax, params.currency, params.rounding)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Calculation failed",
      });
    }
  }

  if (result) {
    const markdown = toMarkdown(result.result, result.params);

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="New Calculation"
              icon={Icon.ArrowClockwise}
              onAction={() => setResult(null)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (Text)"
              content={toClipboardText(result.result, result.params)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (Markdown)"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Result (CSV)"
              content={toCSV(result.result, result.params)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
            <Action.Paste
              title="Paste Result"
              content={toClipboardText(result.result, result.params)}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate compound interest and regular savings" />

      <Form.TextField id="principal" title="Principal (Initial Investment)" placeholder="e.g., 100000 or 100,000" defaultValue="0" />

      <Form.TextField id="rate" title="Annual Interest Rate (%)" placeholder="e.g., 5 or 5%" />

      <Form.TextField id="years" title="Period (Years)" placeholder="e.g., 10 or 10y" />

      <Form.TextField id="monthly" title="Monthly Contribution" placeholder="e.g., 30000 (0 if none)" defaultValue="0" />

      <Form.Separator />

      <Form.Dropdown id="freq" title="Compound Frequency" defaultValue={defaultFreq}>
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="daily" title="Daily" />
      </Form.Dropdown>

      <Form.Description text="* Monthly calculation is used when contributions are enabled" />

      <Form.Separator />

      <Form.Checkbox id="afterTax" title="After-Tax Calculation" label="Apply tax rate to gains" defaultValue={false} />

      <Form.TextField id="taxRate" title="Tax Rate (%)" placeholder="e.g., 20 (varies by country)" defaultValue={defaultTaxRate} />

      <Form.Separator />

      <Form.Dropdown id="currency" title="Currency" defaultValue={defaultCurrency}>
        <Form.Dropdown.Item value="JPY" title="Japanese Yen (JPY)" />
        <Form.Dropdown.Item value="USD" title="US Dollar (USD)" />
        <Form.Dropdown.Item value="EUR" title="Euro (EUR)" />
      </Form.Dropdown>

      <Form.Dropdown id="rounding" title="Rounding" defaultValue={defaultRounding}>
        <Form.Dropdown.Item value="floor" title="Floor" />
        <Form.Dropdown.Item value="round" title="Round" />
        <Form.Dropdown.Item value="ceil" title="Ceiling" />
      </Form.Dropdown>
    </Form>
  );
}
