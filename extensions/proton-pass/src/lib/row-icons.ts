import { Icon, Image } from "@raycast/api";
import { TOTP_ICON } from "./utils";

const ROW_ICONS: Partial<Record<string, Image.ImageLike>> = {
  username: Icon.Person,
  email: Icon.Envelope,
  password: Icon.Key,
  totp: TOTP_ICON,
  note: Icon.Document,
  vault: Icon.Box,
  folder: Icon.Folder,
  modified: Icon.Calendar,
  // Cards
  cardholderName: Icon.Person,
  cardNumber: Icon.CreditCard,
  expirationDate: Icon.Calendar,
  securityCode: Icon.Lock,
  pin: Icon.Lock,
  // Identities
  fullName: Icon.Person,
  identityEmail: Icon.Envelope,
  phoneNumber: Icon.Phone,
  address: Icon.House,
  birthdate: Icon.Calendar,
  organization: Icon.Building,
  socialSecurityNumber: Icon.Lock,
  passportNumber: Icon.Lock,
  licenseNumber: Icon.Lock,
  identityWebsite: Icon.Globe,
  secondPhoneNumber: Icon.Phone,
  company: Icon.Building,
  personalWebsite: Icon.Globe,
  workPhoneNumber: Icon.Phone,
  workEmail: Icon.Envelope,
  // Aliases, SSH keys and Wi-Fi networks
  aliasAddress: Icon.AtSymbol,
  publicKey: Icon.Key,
  privateKey: Icon.Lock,
  ssid: Icon.Wifi,
  wifiPassword: Icon.Key,
  security: Icon.Shield,
};

/** The icon of a row of the details, which the Copy action of its field shares. */
export function rowIcon(id: string): Image.ImageLike | undefined {
  return ROW_ICONS[id];
}
