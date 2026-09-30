export type Value = {
  value_buy: number;
  value_avg: number;
  value_sell: number;
};

export type ResponseType = {
  oficial: Value;
  blue: Value;
};

export enum Currency {
  usd_official = "usd_official",
  usd_blue = "usd_blue",
  ars = "ars",
}
