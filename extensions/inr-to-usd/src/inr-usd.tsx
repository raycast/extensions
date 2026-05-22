import { ActionPanel, Action, LaunchProps, Detail } from "@raycast/api";
import { useMemo } from "react";

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

import { commaUSStandard, commaINStandard, countLastZeros } from "./util";
import {
  reformatCurrencyArray,
  convertToInternationalCurrencySystem,
} from "./script";
import { inrWordsToNumber } from "./inr_words_to_number";
import { inrToWords } from "./inr_to_words";
import { convertDollarsAndCents } from "./usd_to_words";
import { useExchangeRate } from "./fetch_exchange_rate";

export default function Command(
  props: LaunchProps<{ arguments: { inrValue: string } }>,
) {
  const input = props.arguments.inrValue;
  const { rate, isLoading, lastUpdated } = useExchangeRate();

  const result = useMemo(() => {
    if (!input.trim()) return null;

    const formattedCurrencyArr = reformatCurrencyArray(input);
    if (formattedCurrencyArr.length === 0) return null;

    const formattedCurrency = "₹" + formattedCurrencyArr.join(" ");
    const intINRValue = inrWordsToNumber(formattedCurrencyArr);
    if (intINRValue === "NaN" || intINRValue === "" || intINRValue === "0")
      return null;

    const exchangeRate = parseFloat((1 / rate).toFixed(5));
    const inrNum = parseFloat(intINRValue);
    if (isNaN(inrNum)) return null;

    const outputUSD = inrNum * exchangeRate;

    return {
      formattedCurrency,
      inrWithComma: "₹" + commaINStandard(inrNum),
      zerosAtLast: countLastZeros(intINRValue),
      inrShort: inrToWords(intINRValue, true, true),
      inrWords: inrToWords(intINRValue),
      absUsd: "$" + commaUSStandard(outputUSD),
      shortUsd: "$" + convertToInternationalCurrencySystem(outputUSD),
      usdWords: convertDollarsAndCents(outputUSD),
    };
  }, [input, rate]);

  const exchangeInfo = `₹1 = $${(1 / rate).toFixed(5)}`;

  return result ? (
    <Detail
      isLoading={isLoading}
      markdown={[
        `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`,
        `$$\\color{gray}\\Large\\text{${result.formattedCurrency}} \\;\\rightarrow\\; \\color{white}\\Huge\\text{${result.shortUsd.replace("$", "\\$")}}$$`,
        ``,
        `---`,
        `$$\\large\\text{Exchange} \\quad \\normalsize\\color{gray}\\text{${rate}} \\quad \\text{${exchangeInfo.replace("$", "\\$")}} \\quad \\scriptsize\\color{darkgray}\\text{Updated ${timeAgo(lastUpdated)}}$$`,
        ``,
        `---`,
        ``,
        `| | |`,
        `|:--|--:|`,
        `| **USD** | ${result.absUsd} |`,
        `| **Words** | ${result.usdWords} |`,
        `| **INR** | ${result.inrWithComma} |`,
        `| **INR (Short)** | ${result.inrShort} |`,
        `| **INR (Words)** | ${result.inrWords} |`,
        ``,
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy USD (Short)"
            content={result.shortUsd}
          />
          <Action.CopyToClipboard title="Copy USD" content={result.absUsd} />
          <Action.CopyToClipboard
            title="Copy INR"
            content={result.inrWithComma}
          />
          <Action.CopyToClipboard
            title="Copy INR (Short)"
            content={result.inrShort}
          />
          <Action.CopyToClipboard
            title="Copy Words"
            content={result.usdWords}
          />
          <Action.CopyToClipboard
            title="Copy INR Words"
            content={result.inrWords}
          />
        </ActionPanel>
      }
    />
  ) : (
    <Detail markdown="## Currency Converter\n\nEnter an INR value" />
  );
}
