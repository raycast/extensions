import { Form } from "@raycast/api";
import { AverageResult } from "../types";
import { formatCurrency, formatLot, formatPrice } from "../utils/formatter";

interface ResultProps {
  /** The calculated result, or `null` while the form is empty/invalid. */
  result: AverageResult | null;
  /** Validation message to show instead of a result, when `result` is `null`. */
  message: string | null;
}

/**
 * Renders the live calculation output at the bottom of the form:
 * Total Lot, Total Modal, New Investment Needed, and the (highlighted) Average Price.
 */
export function Result({ result, message }: ResultProps) {
  return (
    <>
      <Form.Separator />
      {result ? (
        <>
          <Form.Description title="Total Lot" text={formatLot(result.totalLot)} />
          <Form.Description title="Total Modal" text={formatCurrency(result.totalInvestment)} />
          <Form.Description title="New Investment Needed" text={formatCurrency(result.newInvestmentNeeded)} />
          <Form.Description title="⭐ Average Price" text={formatPrice(result.averagePrice)} />
        </>
      ) : (
        <Form.Description title="Result" text={message ?? ""} />
      )}
    </>
  );
}
