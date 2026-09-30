interface Data {
  value_avg: number;
  value_sell: number;
  value_buy: number;
}

interface Response {
  oficial: Data;
  blue: Data;
  last_update: Date;
}
