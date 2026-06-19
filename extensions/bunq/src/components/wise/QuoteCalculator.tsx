/**
 * Quote calculator form component for getting exchange quotes.
 */

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { createTransferWiseQuote } from "../../api/endpoints";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { QuoteDetail } from "./QuoteDetail";
import type { CurrencyInfo } from "./wise-helpers";
import { requireUserId } from "../../lib/session-guard";

interface QuoteCalculatorProps {
  session: ReturnType<typeof useBunqSession>;
  currencies: CurrencyInfo[];
  defaultTarget?: string;
}

export function QuoteCalculator({ session, currencies, defaultTarget = "USD" }: QuoteCalculatorProps) {
  const { push } = useNavigation();
  const [sourceCurrency, setSourceCurrency] = useState(DEFAULT_CURRENCY);
  const [targetCurrency, setTargetCurrency] = useState(defaultTarget);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGetQuote = async () => {
    const parsed = Number(amount?.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a valid amount" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Getting quote..." });

      const userId = requireUserId(session);
      const quote = await withSessionRefresh(session, () =>
        createTransferWiseQuote(
          userId,
          {
            currency_source: sourceCurrency,
            currency_target: targetCurrency,
            amount_source: { value: amount, currency: sourceCurrency },
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Quote received" });
      push(<QuoteDetail quote={quote} sourceCurrency={sourceCurrency} targetCurrency={targetCurrency} />);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to get quote", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Get Quote"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Quote" icon={Icon.Calculator} onSubmit={handleGetQuote} />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate exchange rates for international transfers" />
      <Form.Dropdown id="sourceCurrency" title="From Currency" value={sourceCurrency} onChange={setSourceCurrency}>
        {currencies.map((c) => (
          <Form.Dropdown.Item
            key={c.currency}
            value={c.currency}
            title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetCurrency" title="To Currency" value={targetCurrency} onChange={setTargetCurrency}>
        {currencies.map((c) => (
          <Form.Dropdown.Item
            key={c.currency}
            value={c.currency}
            title={`${c.currency}${c.name ? ` - ${c.name}` : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="amount" title="Amount" placeholder="100.00" value={amount} onChange={setAmount} />
    </Form>
  );
}
