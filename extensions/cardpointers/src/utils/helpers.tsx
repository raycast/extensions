import { Icon } from "@raycast/api";

export function getNumbersOnly(input: string) {
  return input.replace(/\D/g, "");
}

export function getEarningIcon(name: string) {
  switch (name) {
    case "airplanemode_active":
      return Icon.Airplane;
    case "desktop_mac":
      return Icon.Monitor;
    case "domain":
      return Icon.Paperclip;
    case "hardware":
      return Icon.Hammer;
    case "hotel":
      return Icon.House;
    case "local_gas_station":
      return Icon.Gauge;
    case "local_pharmacy":
      return Icon.Pill;
    case "offline_bolt":
      return Icon.Bolt;
    case "people":
      return Icon.TwoPeople;
    case "phone_iphone":
      return Icon.Phone;
    case "restaurant_menu":
      return Icon.CircleProgress100;
    case "shopping_basket":
      return Icon.Box;
    case "shopping_cart":
      return Icon.Cart;
    case "star":
      return Icon.Star;
    case "theaters":
      return Icon.FilmStrip;
    case "time_to_leave":
      return Icon.Car;
    case "tv":
      return Icon.Terminal;
    case "view_agenda":
      return Icon.AppWindowGrid3x3;
    default:
      return Icon.QuestionMark;
  }
}

export function toCurrency(value: string) {
  if (!value) {
    return "n/a";
  }

  const str = `${value}`;
  const num = Number(str.replace(/,/g, ""));
  let finalValue = num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  if (finalValue.endsWith(".00")) {
    finalValue = finalValue.replace(".00", "");
  }

  return finalValue;
}
