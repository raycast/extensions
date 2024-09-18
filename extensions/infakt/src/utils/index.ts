export const paymentMethods = [
  {
    name: "Transfer",
    value: "transfer",
  },
  {
    name: "Cash",
    value: "cash",
  },
  {
    name: "Card",
    value: "card",
  },
  {
    name: "Barter",
    value: "barter",
  },
  {
    name: "Check",
    value: "check",
  },
  {
    name: "Bill Of Sale",
    value: "bill_of_sale",
  },
  {
    name: "Delivery",
    value: "delivery",
  },
  {
    name: "Compensation",
    value: "compensation",
  },
  {
    name: "Accredited",
    value: "accredited",
  },
  {
    name: "PayPal",
    value: "paypal",
  },
  {
    name: "Instalment Sale",
    value: "instalment_sale",
  },
  {
    name: "PayU",
    value: "payu",
  },
  {
    name: "tPay",
    value: "tpay",
  },
  {
    name: "Przelewy24",
    value: "przelewy24",
  },
  {
    name: "Dotpay",
    value: "dotpay",
  },
  {
    name: "Other",
    value: "other",
  },
] as const;

export const printTypes = [
  {
    name: "Original",
    value: "original",
  },
  {
    name: "Copy",
    value: "copy",
  },
  {
    name: "Original Duplicate",
    value: "original_duplicate",
  },
  {
    name: "Duplicate",
    value: "duplicate",
  },
  {
    name: "Regular",
    value: "regular",
  },
];

export const locales = [
  {
    name: "Polish",
    value: "pl",
  },
  {
    name: "English",
    value: "en",
  },
  {
    name: "Polish-English",
    value: "pe",
  },
];

export const currencies = [
  {
    name: "Polish Zloty",
    value: "PLN",
  },
  {
    name: "Thai Baht",
    value: "THB",
  },
  {
    name: "US Dollar",
    value: "USD",
  },
  {
    name: "Australian Dollar",
    value: "AUD",
  },
  {
    name: "Hong Kong Dollar",
    value: "HKD",
  },
  {
    name: "Canadian Dollar",
    value: "CAD",
  },
  {
    name: "New Zealand Dollar",
    value: "NZD",
  },
  {
    name: "Singapore Dollar",
    value: "SGD",
  },
  {
    name: "Euro",
    value: "EUR",
  },
  {
    name: "Hungarian Forint",
    value: "HUF",
  },
  {
    name: "Swiss Franc",
    value: "CHF",
  },
  {
    name: "British Pound Sterling",
    value: "GBP",
  },
  {
    name: "Ukrainian Hryvnia",
    value: "UAH",
  },
  {
    name: "Japanese Yen",
    value: "JPY",
  },
  {
    name: "Czech Koruna",
    value: "CZK",
  },
  {
    name: "Danish Krone",
    value: "DKK",
  },
  {
    name: "Icelandic Króna",
    value: "ISK",
  },
  {
    name: "Norwegian Krone",
    value: "NOK",
  },
  {
    name: "Swedish Krona",
    value: "SEK",
  },
  {
    name: "Croatian Kuna",
    value: "HRK",
  },
  {
    name: "Romanian Leu",
    value: "RON",
  },
  {
    name: "Bulgarian Lev",
    value: "BGN",
  },
  {
    name: "Turkish Lira",
    value: "TRY",
  },
  {
    name: "Lithuanian Litas",
    value: "LTL",
  },
  {
    name: "Latvian Lats",
    value: "LVL",
  },
  {
    name: "Philippine Peso",
    value: "PHP",
  },
  {
    name: "Mexican Peso",
    value: "MXN",
  },
  {
    name: "South African Rand",
    value: "ZAR",
  },
  {
    name: "Brazilian Real",
    value: "BRL",
  },
  {
    name: "Malaysian Ringgit",
    value: "MYR",
  },
  {
    name: "Russian Ruble",
    value: "RUB",
  },
  {
    name: "Indonesian Rupiah",
    value: "IDR",
  },
  {
    name: "South Korean Won",
    value: "KRW",
  },
  {
    name: "Chinese Yuan Renminbi",
    value: "CNY",
  },
  {
    name: "Indian Rupee",
    value: "INR",
  },
];

export type FormItemRef = {
  focus: () => void;
  reset: () => void;
};
