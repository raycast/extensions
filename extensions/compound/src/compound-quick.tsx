import { LaunchProps, getPreferenceValues, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import type { Preferences, Params, Result } from "./types";
import { parseQuickInput } from "./parse";
import { calcCompound } from "./calc";
import { toMarkdown, toClipboardText, toCSV } from "./format";

interface Arguments {
  query: string;
}

const TRANSLATIONS = {
  en: {
    examplesTitle: "Examples",
    copyExample: "Copy Example",
    newCalculation: "New Calculation",
    copyResult: "Copy Result (Text)",
    copyMarkdown: "Copy Result (Markdown)",
    copyCSV: "Copy Result (CSV)",
    pasteResult: "Paste Result",
    error: "Error",
    principal: "Principal",
    rate: "Rate",
    period: "Period",
    monthly: "Monthly",
    frequency: "Frequency",
    taxRate: "Tax Rate",
    currency: "Currency",
    rounding: "Rounding",
    freqYearly: "Yearly",
    freqMonthly: "Monthly",
    freqDaily: "Daily",
    roundFloor: "Floor",
    roundRound: "Round",
    roundCeil: "Ceiling",
    months: "months",
    years: "years",
    enterInput: `## Input Format

| Pattern | Example |
|---------|---------|
| rate years | \`5% 10y\` |
| principal rate years | \`$10,000 5% 10y\` |
| principal rate years monthly | \`$10,000 5% 10y $500\` |
| principal rate years monthly tax | \`$10,000 5% 10y $500 20%\` |

### Supported Formats
- **Years**: \`10y\`, \`10years\`, \`10年\`
- **Months**: \`6m\`, \`6months\`, \`6ヶ月\`
- **Money**: \`100000\`, \`100,000\`, \`$100\`, \`¥1000\`, \`10万円\`
- **Key-value**: \`p=10000 r=5 y=10 m=500 tax=20\``,
    examples: [
      { title: "Rate and years", value: "5% 10y" },
      { title: "Principal only", value: "$10,000 5% 10y" },
      { title: "With monthly", value: "$10,000 5% 10years $500" },
      { title: "With tax", value: "$10,000 5% 10y $500 20%" },
      { title: "Key-value", value: "p=10000 r=5 y=10 m=500 tax=20" },
    ],
  },
  ja: {
    examplesTitle: "入力例",
    copyExample: "例をコピー",
    newCalculation: "新しい計算",
    copyResult: "結果をコピー（テキスト）",
    copyMarkdown: "結果をコピー（Markdown）",
    copyCSV: "結果をコピー（CSV）",
    pasteResult: "結果を貼り付け",
    error: "エラー",
    principal: "元本",
    rate: "年利率",
    period: "期間",
    monthly: "毎月積立額",
    frequency: "複利頻度",
    taxRate: "税率",
    currency: "通貨",
    rounding: "端数処理",
    freqYearly: "年複利",
    freqMonthly: "月複利",
    freqDaily: "日複利",
    roundFloor: "切り捨て",
    roundRound: "四捨五入",
    roundCeil: "切り上げ",
    months: "ヶ月",
    years: "年",
    enterInput: `## 入力形式

| パターン | 例 |
|----------|-----|
| 利率 期間 | \`5% 10年\` |
| 元本 利率 期間 | \`100万円 5% 10年\` |
| 元本 利率 期間 積立 | \`100万円 5% 10年 3万円\` |
| 元本 利率 期間 積立 税率 | \`100万円 5% 10年 3万円 20%\` |

### 対応フォーマット
- **年数**: \`10y\`, \`10years\`, \`10年\`
- **月数**: \`6m\`, \`6months\`, \`6ヶ月\`
- **金額**: \`100000\`, \`100,000\`, \`$100\`, \`¥1000\`, \`10万円\`
- **キー=値**: \`p=100万 r=5 y=10 m=3万 tax=20\``,
    examples: [
      { title: "利率と期間", value: "5% 10年" },
      { title: "元本のみ", value: "100万円 5% 10年" },
      { title: "積立あり", value: "100万円 5% 10年 3万円" },
      { title: "税引後計算", value: "100万円 5% 10年 3万円 20%" },
      { title: "キー=値形式", value: "p=100万 r=5 y=10 m=3万 tax=20" },
    ],
  },
} as const;

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const language = preferences.language || "en";
  const t = TRANSLATIONS[language];
  const [result, setResult] = useState<{ params: Params; result: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = props.arguments.query?.trim();
    if (!query) {
      setError(null);
      setResult(null);
      return;
    }

    try {
      const params = parseQuickInput(query, preferences, language);
      const calcResult = calcCompound(params);
      setResult({ params, result: calcResult });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : TRANSLATIONS[language].error);
      setResult(null);
    }
  }, [props.arguments.query, language]);

  if (error) {
    return (
      <Detail
        markdown={`# ${t.error}\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title={t.newCalculation}
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setError(null);
                setResult(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (result) {
    const markdown = toMarkdown(result.result, result.params, language);

    const freqLabel =
      result.params.freq === "yearly" ? t.freqYearly : result.params.freq === "monthly" ? t.freqMonthly : t.freqDaily;

    const roundingLabel =
      result.params.rounding === "floor"
        ? t.roundFloor
        : result.params.rounding === "round"
          ? t.roundRound
          : t.roundCeil;

    const periodText =
      result.result.months < 12 ? `${result.result.months}${t.months}` : `${result.result.months / 12}${t.years}`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title={t.principal} text={result.params.principal.toLocaleString()} />
            <Detail.Metadata.Label title={t.rate} text={`${result.params.ratePct}%`} />
            <Detail.Metadata.Label title={t.period} text={periodText} />
            {result.params.monthly > 0 && (
              <Detail.Metadata.Label title={t.monthly} text={result.params.monthly.toLocaleString()} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title={t.frequency} text={freqLabel} />
            {result.params.taxRatePct > 0 && (
              <Detail.Metadata.Label title={t.taxRate} text={`${result.params.taxRatePct}%`} />
            )}
            <Detail.Metadata.Label title={t.currency} text={result.params.currency} />
            <Detail.Metadata.Label title={t.rounding} text={roundingLabel} />
          </Detail.Metadata>
        }
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
    <Detail
      markdown={t.enterInput}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t.examplesTitle} text="" />
          <Detail.Metadata.Separator />
          {t.examples.map((ex, i) => (
            <Detail.Metadata.Label key={i} title={ex.title} text={ex.value} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {t.examples.map((ex, i) => (
            <Action.CopyToClipboard key={i} title={`${t.copyExample}: ${ex.title}`} content={ex.value} />
          ))}
        </ActionPanel>
      }
    />
  );
}
