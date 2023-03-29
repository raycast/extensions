import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { FundingOffer } from "bfx-api-node-models";
import Bitfinex, { handleAPIError } from "../lib/api";
import { basicFieldValidations } from "../lib/formUtils";

type UpdateOfferFormValues = {
  amount: string;
  rate: string;
  period: string;
};

type EditOfferFormProps = {
  offer: any;
  mutateFundingInfo: () => void;
  mutateBalanceInfo: () => void;
};

const { symbol, ...fieldValidation } = basicFieldValidations;

export function EditOfferForm(props: EditOfferFormProps) {
  const defaultRate = Number(props.offer.rate * 365 * 100).toFixed(3);
  const rest = Bitfinex.rest();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<UpdateOfferFormValues>({
    async onSubmit(values) {
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
      } catch (e: any) {
        handleAPIError("Update offer failed", e);
      }

      props.mutateFundingInfo();
      props.mutateBalanceInfo();

      pop();
    },
    validation: fieldValidation,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Offer" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Amount" defaultValue={Number(props.offer.amount).toFixed(5)} {...itemProps.amount} />
      <Form.TextField title="Rate (in APR)" defaultValue={defaultRate} {...itemProps.rate} />
      <Form.TextField title="Period (in days)" defaultValue={String(props.offer.period)} {...itemProps.period} />
    </Form>
  );
}
