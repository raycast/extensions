import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import LendingRates from "../lending-rates";
import Bitfinex, { handleAPIError } from "../lib/api";
import { getCurrency } from "../lib/preference";
import { useForm } from "@raycast/utils";
import { basicFieldValidations } from "../lib/formUtils";

type CreateOfferFormValues = {
  symbol: string;
  amount: string;
  rate: string;
  period: string;
};

export function CreateOfferForm({
  mutateBalanceInfo,
  mutateFundingInfo,
}: {
  mutateFundingInfo: () => void;
  mutateBalanceInfo: () => void;
}) {
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateOfferFormValues>({
    async onSubmit(values) {
      try {
        const newOffer = new FundingOffer({
          type: "LIMIT",
          symbol: values.symbol,
          rate: parseFloat(values.rate) / 100 / 365,
          amount: parseFloat(values.amount),
          period: parseInt(values.period, 10),
        });
        await rest.submitFundingOffer(newOffer);
      } catch (e: any) {
        handleAPIError("Create offer failed", e);
      }

      mutateFundingInfo();
      mutateBalanceInfo();

      pop();
    },
    validation: basicFieldValidations,
  });

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
      <Form.TextField title="Symbol" defaultValue={getCurrency()} {...itemProps.symbol} />

      <Form.TextField title="Amount" defaultValue="150" {...itemProps.amount} />
      <Form.TextField
        title="Rate (in APR)"
        defaultValue="18"
        info="Press CMD+Shift+L to see recent lending rates."
        {...itemProps.rate}
      />
      <Form.TextField title="Period (in days)" defaultValue="7" {...itemProps.period} />
    </Form>
  );
}
