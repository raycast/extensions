import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FundingOffer } from "bfx-api-node-models";
import Bitfinex from "../lib/api";

export function EditOfferForm(props: { offer: any; mutateFundingInfo: () => void; mutateBalanceInfo: () => void }) {
  const defaultRate = Number(props.offer.rate * 365 * 100).toFixed(3);
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const onSubmit = async (values: any) => {
    try {
      const newOffer = new FundingOffer({
        type: "LIMIT",
        symbol: props.offer.symbol,
        rate: parseFloat(values.rate) / 100 / 365,
        amount: parseFloat(values.amount),
        period: parseInt(values.period, 10),
      });
      await rest.cancelFundingOffer(props.offer.id);
      await rest.submitFundingOffer(newOffer);

      props.mutateFundingInfo();
      props.mutateBalanceInfo();

      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Update Offer Failed",
        message: String(e),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Offer" onSubmit={onSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" defaultValue={Number(props.offer.amount).toFixed(5)} />
      <Form.TextField id="rate" title="Rate (in APR)" defaultValue={defaultRate} />
      <Form.TextField id="period" title="Period (in days)" defaultValue={String(props.offer.period)} />
    </Form>
  );
}
