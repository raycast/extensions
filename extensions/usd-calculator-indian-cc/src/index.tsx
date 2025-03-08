import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

interface CommandForm {
  usdAmount: string;
}

interface WiseRateResponse {
  value: number;
}

interface CalculationResult {
  usdAmount: number;
  inrAmount: number;
  foreignExchangeFee: number;
  gst: number;
  finalAmount: number;
  exchangeRate: number;
}

export default function Command(): JSX.Element {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: CommandForm): Promise<void> {
    try {
      setIsLoading(true);
      const usdAmount = parseFloat(values.usdAmount);
      if (isNaN(usdAmount)) {
        throw new Error("Please enter a valid USD amount");
      }

      // Fetch exchange rate from Wise API
      const response = await fetch(
        "https://wise.com/rates/history+live?source=USD&target=INR&length=1",
      );
      const data = (await response.json()) as WiseRateResponse[];
      const usdInrExchangeRate = data[0].value;

      // Calculate amounts
      const inrAmount = usdAmount * usdInrExchangeRate;
      const foreignExchangeFee = inrAmount * 0.0375;
      const gst = foreignExchangeFee * 0.18;
      const finalAmount = inrAmount + foreignExchangeFee + gst;

      setResult({
        usdAmount,
        inrAmount,
        foreignExchangeFee,
        gst,
        finalAmount,
        exchangeRate: usdInrExchangeRate,
      });

      // Copy to clipboard and notify
      await Clipboard.copy(finalAmount.toFixed(2));
      await showToast({
        style: Toast.Style.Success,
        title: "Amount copied to clipboard",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getBreakdown(): string {
    if (!result) return "Includes forex markup fee (3.75%) and GST (18%)";

    const formatINR = (amount: number): string => `₹${amount.toFixed(2)}`;

    return `💱 1 USD = ${formatINR(result.exchangeRate)}

$${result.usdAmount} USD Breakdown:
────────────────────────
Base Amount:     ${formatINR(result.inrAmount)}
Forex (3.75%):   ${formatINR(result.foreignExchangeFee)}
GST (18%):       ${formatINR(result.gst)}
────────────────────────
Total:          ${formatINR(result.finalAmount)}

Amount copied to clipboard • Exchange rates from Wise`;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="usdAmount"
        title="USD Amount"
        placeholder="Type amount and press Enter"
      />
      <Form.Description text={getBreakdown()} />
    </Form>
  );
}
