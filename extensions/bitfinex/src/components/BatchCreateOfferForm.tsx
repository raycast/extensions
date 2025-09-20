import { useMemo, useCallback } from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import LendingRates from "../lending-rates";
import Bitfinex, { handleAPIError } from "../lib/api";
import { getCurrency } from "../lib/preference";
import { useForm } from "@raycast/utils";
import { basicFieldValidations } from "../lib/formUtils";
import { MINIMUM_OFFER_AMOUNT } from "../lib/constants";

type BatchCreateOfferFormValues = {
  symbol: string;
  amount: string;
  rate: string;
  period: string;
};

const calculateBatchAmountGroups = (availableFunding: number, amount: number) => {
  const remainder = availableFunding % amount;
  const groupsLength = Math.floor(availableFunding / amount);

  if (remainder < MINIMUM_OFFER_AMOUNT) {
    return [...new Array(groupsLength - 1).fill(amount), Math.floor(amount + remainder)];
  } else {
    return new Array(groupsLength).fill(amount);
  }
};

export function BatchCreateOfferForm({
  availableFunding,
  mutateBalanceInfo,
  mutateFundingInfo,
}: {
  availableFunding: number;
  mutateFundingInfo: () => void;
  mutateBalanceInfo: () => void;
}) {
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const validateAmount = useCallback(
    (value?: string) => {
      if (!value) {
        return "Amount is required";
      }

      const amount = parseInt(value);

      if (isNaN(amount)) {
        return "Amount is not a number";
      }

      if (amount > availableFunding) {
        return "Amount is greater than available funding";
      }

      if (amount < MINIMUM_OFFER_AMOUNT) {
        return `Minimum amount is ${MINIMUM_OFFER_AMOUNT}`;
      }
    },
    [availableFunding]
  );

  const { handleSubmit, itemProps, values } = useForm<BatchCreateOfferFormValues>({
    async onSubmit(values) {
      const amount = parseFloat(values.amount);
      const groupAmountValues = calculateBatchAmountGroups(availableFunding, amount);

      const payload = groupAmountValues.map((groupAmount) => {
        return {
          type: "LIMIT",
          symbol: values.symbol,
          rate: parseFloat(values.rate) / 100 / 365,
          amount: groupAmount,
          period: parseInt(values.period, 10),
        };
      });

      try {
        await Promise.all(payload.map((offer) => rest.submitFundingOffer(new FundingOffer(offer))));
      } catch (e: any) {
        handleAPIError("Batch Create offer failed", e);
      }

      mutateFundingInfo();
      mutateBalanceInfo();

      pop();
    },
    validation: {
      period: basicFieldValidations.period,
      rate: basicFieldValidations.rate,
      symbol: basicFieldValidations.symbol,
      amount: validateAmount,
    },
    initialValues: {
      symbol: getCurrency(),
      amount: MINIMUM_OFFER_AMOUNT.toString(),
      rate: "18",
      period: "30",
    },
  });

  const previewAmounts = useMemo(() => {
    const amountRaw = parseFloat(values.amount);

    if (isNaN(amountRaw) || amountRaw <= 0) {
      return [];
    }

    const amount = Math.floor(amountRaw);

    if (availableFunding < amount) {
      return [];
    }

    return calculateBatchAmountGroups(availableFunding, amount);
  }, [availableFunding, values]);

  const previewAmountsDescription = useMemo(() => {
    const errorMessage = validateAmount(values.amount);
    if (itemProps.amount.error || previewAmounts?.length === 0 || errorMessage) {
      return errorMessage || "Fix the amount to see the preview";
    }

    return `The amount will be adjusted if available funding cannot be split evenly. 

${previewAmounts.length} offers will be created with the following amounts:
  
${previewAmounts.join(", ")}`;
  }, [previewAmounts, itemProps.amount.error, validateAmount, values.amount]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Offer" onSubmit={handleSubmit} icon={Icon.PlusCircle} />
          <Action.Push
            title="Show Lending Rates"
            target={<LendingRates />}
            icon={Icon.LineChart}
            shortcut={{
              key: "l",
              modifiers: ["cmd", "shift"],
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Create Batch Offer"
        text="Batch create offers for the same symbol, amount, rate and period. The amount will be adjusted if available funding cannot be split evenly."
      />

      <Form.Description title="Preview" text={previewAmountsDescription} />

      <Form.TextField title="Symbol" {...itemProps.symbol} />

      <Form.TextField title="Amount for each offer" {...itemProps.amount} />
      <Form.TextField title="Rate (in APR)" info="Press CMD+Shift+L to see recent lending rates." {...itemProps.rate} />
      <Form.TextField title="Period (in days)" {...itemProps.period} />
    </Form>
  );
}
