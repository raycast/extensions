import { Detail } from "@raycast/api";
import { PaymentOption } from "../../types";
import { formatCurrency } from "../../utils";

type Props = {
  paymentOption?: PaymentOption;
  rate: number;
};

function FeeBreakdown({ paymentOption, rate }: Props) {
  if (!paymentOption) {
    return null;
  }

  const price = paymentOption.price;

  return (
    <Detail.Metadata>
      {price.items.map((item) => {
        return (
          <Detail.Metadata.Label
            key={item.label}
            title={item.label}
            text={formatCurrency(item.value.amount, item.value.currency)}
          />
        );
      })}
      <Detail.Metadata.Label
        title={price.total.label}
        text={formatCurrency(price.total.value.amount, price.total.value.currency)}
      />
      <Detail.Metadata.Label title="Rate" text={rate.toString()} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Recepient gets">
        <Detail.Metadata.TagList.Item
          text={formatCurrency(paymentOption.targetAmount, paymentOption.targetCurrency)}
          color="#9fe870"
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label text="" title={`Should arrive ${paymentOption?.formattedEstimatedDelivery}`} />
    </Detail.Metadata>
  );
}

export default FeeBreakdown;
