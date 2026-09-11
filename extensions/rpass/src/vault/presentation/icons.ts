import { Icon } from "@raycast/api";

const OPTION_ICON_MAP: Record<string, Icon> = {
  pass: Icon.Key,
  password: Icon.Key,
  otp: Icon.Hourglass,
  otpauth: Icon.Hourglass,
  email: Icon.Envelope,
  username: Icon.Person,
  user: Icon.Person,
  login: Icon.Person,
  url: Icon.Link,
  number: Icon.CreditCard,
  brand: Icon.CreditCard,
  "cardholder name": Icon.Person,
  expiration: Icon.Calendar,
  "security code": Icon.Code,
};

export function getOptionIcon(text: string): Icon {
  return OPTION_ICON_MAP[text.toLowerCase()] || Icon.Minus;
}
