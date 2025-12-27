import { Icon } from "@raycast/api";

export const IDENTIFIER_CONFIG: Record<IdentifierType, { label: string; icon: Icon }> = {
  imei: { label: "IMEI", icon: Icon.Devices },
  iccid: { label: "ICCID", icon: Icon.Mobile },
  msisdn: { label: "MSISDN", icon: Icon.Phone },
  uuid: { label: "UUID", icon: Icon.Code },
  mac: { label: "MAC Address", icon: Icon.Wifi },
  ip: { label: "IP Address", icon: Icon.Network },
  iban: { label: "IBAN", icon: Icon.BankNote },
};

export type IdentifierType = "imei" | "iccid" | "msisdn" | "uuid" | "mac" | "ip" | "iban";

export interface Identifier {
  type: IdentifierType;
  label: string;
  value: string;
}
