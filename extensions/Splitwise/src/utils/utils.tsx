export function getCurrency_code(currency_code: string) {
    switch (currency_code) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "JPY":
        return "¥";
      default:
        return currency_code;
    }
  }