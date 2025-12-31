import { Form, ActionPanel, Action, showToast, Toast, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import type { Preferences, Params, Result } from "./types";
import { parseFormInput } from "./parse";
import { calcCompound } from "./calc";
import { formatMoney, toMarkdown, toClipboardText, toCSV } from "./format";

const TRANSLATIONS = {
  en: {
    formDescription: "Calculate compound interest and regular savings",
    principal: "Principal (Initial Investment)",
    principalPlaceholder: "e.g., 100000 or 100,000",
    rate: "Annual Interest Rate (%)",
    ratePlaceholder: "e.g., 5 or 5%",
    years: "Period (Years)",
    yearsPlaceholder: "e.g., 10 or 10y",
    monthly: "Monthly Contribution",
    monthlyPlaceholder: "e.g., 30000 (0 if none)",
    compoundFreq: "Compound Frequency",
    compoundFreqNote: "* Monthly calculation is used when contributions are enabled",
    yearly: "Yearly",
    monthlyFreq: "Monthly",
    daily: "Daily",
    afterTax: "After-Tax Calculation",
    afterTaxLabel: "Apply tax rate to gains",
    taxRate: "Tax Rate (%)",
    taxRatePlaceholder: "e.g., 20 (varies by country)",
    currency: "Currency",
    currencyJPY: "Japanese Yen (JPY)",
    currencyUSD: "US Dollar (USD)",
    currencyEUR: "Euro (EUR)",
    rounding: "Rounding",
    roundingFloor: "Floor",
    roundingRound: "Round",
    roundingCeil: "Ceiling",
    calculate: "Calculate",
    calculationComplete: "Calculation Complete",
    finalAmount: "Final Amount",
    error: "Error",
    calculationFailed: "Calculation failed",
    newCalculation: "New Calculation",
    copyResult: "Copy Result (Text)",
    copyMarkdown: "Copy Result (Markdown)",
    copyCSV: "Copy Result (CSV)",
    pasteResult: "Paste Result",
  },
  ja: {
    formDescription: "複利・積立複利を計算します",
    principal: "元本（初期投資額）",
    principalPlaceholder: "例: 100000 または 10万",
    rate: "年利率 (%)",
    ratePlaceholder: "例: 5 または 5%",
    years: "期間（年）",
    yearsPlaceholder: "例: 10 または 10y",
    monthly: "毎月積立額",
    monthlyPlaceholder: "例: 30000（積立なしの場合は0）",
    compoundFreq: "複利頻度",
    compoundFreqNote: "※ 積立がある場合は月次計算に固定されます",
    yearly: "年複利",
    monthlyFreq: "月複利",
    daily: "日複利",
    afterTax: "税引後計算",
    afterTaxLabel: "利益に対して税率を適用",
    taxRate: "税率 (%)",
    taxRatePlaceholder: "例: 20（国によって異なります）",
    currency: "通貨表示",
    currencyJPY: "日本円 (JPY)",
    currencyUSD: "米ドル (USD)",
    currencyEUR: "ユーロ (EUR)",
    rounding: "端数処理",
    roundingFloor: "切り捨て",
    roundingRound: "四捨五入",
    roundingCeil: "切り上げ",
    calculate: "計算する",
    calculationComplete: "計算完了",
    finalAmount: "最終金額",
    error: "エラー",
    calculationFailed: "計算に失敗しました",
    newCalculation: "新しい計算",
    copyResult: "結果をコピー（テキスト）",
    copyMarkdown: "結果をコピー（Markdown）",
    copyCSV: "結果をコピー（CSV）",
    pasteResult: "結果を貼り付け",
  },
} as const;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const language = preferences.language || "en";
  const t = TRANSLATIONS[language];
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
      const params = parseFormInput(values, language);
      const calcResult = calcCompound(params);
      setResult({ params, result: calcResult });
      await showToast({
        style: Toast.Style.Success,
        title: t.calculationComplete,
        message: `${t.finalAmount}: ${formatMoney(calcResult.fvBeforeTax, params.currency, params.rounding, language)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.error,
        message: error instanceof Error ? error.message : t.calculationFailed,
      });
    }
  }

  if (result) {
    const markdown = toMarkdown(result.result, result.params, language);

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title={t.newCalculation}
              icon={Icon.ArrowClockwise}
              onAction={() => setResult(null)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title={t.copyResult}
              content={toClipboardText(result.result, result.params, language)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title={t.copyMarkdown}
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title={t.copyCSV}
              content={toCSV(result.result, result.params)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
            <Action.Paste
              title={t.pasteResult}
              content={toClipboardText(result.result, result.params, language)}
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
          <Action.SubmitForm title={t.calculate} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t.formDescription} />

      <Form.TextField id="principal" title={t.principal} placeholder={t.principalPlaceholder} defaultValue="0" />

      <Form.TextField id="rate" title={t.rate} placeholder={t.ratePlaceholder} />

      <Form.TextField id="years" title={t.years} placeholder={t.yearsPlaceholder} />

      <Form.TextField id="monthly" title={t.monthly} placeholder={t.monthlyPlaceholder} defaultValue="0" />

      <Form.Separator />

      <Form.Dropdown id="freq" title={t.compoundFreq} defaultValue={defaultFreq}>
        <Form.Dropdown.Item value="yearly" title={t.yearly} />
        <Form.Dropdown.Item value="monthly" title={t.monthlyFreq} />
        <Form.Dropdown.Item value="daily" title={t.daily} />
      </Form.Dropdown>

      <Form.Description text={t.compoundFreqNote} />

      <Form.Separator />

      <Form.Checkbox id="afterTax" title={t.afterTax} label={t.afterTaxLabel} defaultValue={false} />

      <Form.TextField id="taxRate" title={t.taxRate} placeholder={t.taxRatePlaceholder} defaultValue={defaultTaxRate} />

      <Form.Separator />

      <Form.Dropdown id="currency" title={t.currency} defaultValue={defaultCurrency}>
        <Form.Dropdown.Item value="JPY" title={t.currencyJPY} />
        <Form.Dropdown.Item value="USD" title={t.currencyUSD} />
        <Form.Dropdown.Item value="EUR" title={t.currencyEUR} />
      </Form.Dropdown>

      <Form.Dropdown id="rounding" title={t.rounding} defaultValue={defaultRounding}>
        <Form.Dropdown.Item value="floor" title={t.roundingFloor} />
        <Form.Dropdown.Item value="round" title={t.roundingRound} />
        <Form.Dropdown.Item value="ceil" title={t.roundingCeil} />
      </Form.Dropdown>
    </Form>
  );
}
