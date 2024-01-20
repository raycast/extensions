import { MenuBarExtra } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Data {
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
}

export default function Command() {
  const { data, isLoading } = useFetch<Data>("https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT");
  let title = undefined;
  if (data) {
    const lastPrice = parseInt(data.lastPrice);
    const highPrice = parseInt(data.highPrice);
    const lowPrice = parseInt(data.lowPrice);
    const up = format(highPrice - lastPrice);
    const down = format(lastPrice - lowPrice);
    title = `${down}-${format(lastPrice)}-${up}`;
  }

  return <MenuBarExtra title={title} isLoading={isLoading} />;
}

function format(num: number) {
  if (num < 100) {
    return 0;
  }
  const out = parseFloat(num.toString().replace(/..$/, "00"));
  return new Intl.NumberFormat("en-US").format(out);
}
