import { List } from "@raycast/api";
import { CurrencyRate, RatesSnapshot } from "../../types";
import { getFlagImage, getRateAccessories, getRateSubtitle, getRateTitle } from "../../utils";
import { PinProps } from "../PinActionsSection";
import RateActions from "./RateActions";

/** `previous` is an earlier day's rates, to show how much the rate changed since. */
export default function RateListItem(props: { rate: CurrencyRate; previous?: RatesSnapshot; pin: PinProps }) {
  const { rate, previous, pin } = props;

  return (
    <List.Item
      id={rate.id}
      icon={getFlagImage(rate.currencyA.code)}
      title={getRateTitle(rate)}
      subtitle={getRateSubtitle(rate)}
      accessories={getRateAccessories(rate, previous)}
      actions={<RateActions rate={rate} pin={pin} />}
    />
  );
}
