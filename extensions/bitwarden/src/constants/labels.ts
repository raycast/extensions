import { Keyboard } from "@raycast/api";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { Card, Identity, ItemType } from "~/types/vault";

export const VAULT_TIMEOUT_MS_TO_LABEL: Partial<Record<keyof typeof VAULT_TIMEOUT, string>> = {
  [VAULT_TIMEOUT.IMMEDIATELY]: "Immediately",
  [VAULT_TIMEOUT.ONE_MINUTE]: "1 Minute",
  [VAULT_TIMEOUT.FIVE_MINUTES]: "5 Minutes",
  [VAULT_TIMEOUT.FIFTEEN_MINUTES]: "15 Minutes",
  [VAULT_TIMEOUT.THIRTY_MINUTES]: "30 Minutes",
  [VAULT_TIMEOUT.ONE_HOUR]: "1 Hour",
  [VAULT_TIMEOUT.FOUR_HOURS]: "4 Hours",
  [VAULT_TIMEOUT.EIGHT_HOURS]: "8 Hours",
  [VAULT_TIMEOUT.ONE_DAY]: "1 Day",
};

export const CARD_KEY_LABEL: Record<keyof Card, string> = {
  cardholderName: "Cardholder name",
  brand: "Brand",
  number: "Number",
  expMonth: "Expiration month",
  expYear: "Expiration year",
  code: "Security code (CVV)",
};

export const IDENTITY_KEY_LABEL: Record<keyof Identity, string> = {
  title: "Title",
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  username: "Username",
  company: "Company",
  ssn: "Social Security number",
  passportNumber: "Passport number",
  licenseNumber: "License number",
  email: "Email",
  phone: "Phone",
  address1: "Address 1",
  address2: "Address 2",
  address3: "Address 3",
  city: "City / Town",
  state: "State / Province",
  postalCode: "Zip / Postal code",
  country: "Country",
};

export const ITEM_TYPE_TO_LABEL: Record<ItemType, string> = {
  [ItemType.LOGIN]: "Login",
  [ItemType.CARD]: "Card",
  [ItemType.IDENTITY]: "Identity",
  [ItemType.NOTE]: "Secure Note",
  [ItemType.SSH_KEY]: "SSH Key",
};

export const MODIFIER_TO_LABEL: Record<Keyboard.KeyModifier, string> = {
  cmd: "⌘",
  shift: "⇧",
  opt: "⌥",
  ctrl: "⌃",
};
