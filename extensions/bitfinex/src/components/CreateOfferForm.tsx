import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import LendingRates from "../lending-rates";
import Bitfinex, { handleAPIError } from "../lib/api";
import { getCurrency } from "../lib/preference";

export function CreateOfferForm({
  mutateBalanceInfo,
  mutateFundingInfo,
}: {
  mutateFundingInfo: () => void;
  mutateBalanceInfo: () => void;
}) {
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const onSubmit = async (values: any) => {
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
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Offer" onSubmit={onSubmit} icon={Icon.PlusCircle} />
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
      <Form.TextField id="symbol" title="Symbol" defaultValue={getCurrency()} />

      <Form.TextField id="amount" title="Amount" defaultValue="100" />
      <Form.TextField
        id="rate"
        title="Rate (in APR)"
        defaultValue="18"
        info="Press CMD+Shift+L to see recent lending rates."
      />
      <Form.TextField id="period" title="Period (in days)" defaultValue="7" />
    </Form>
  );
}
