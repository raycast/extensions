import type { Icon as IconType } from "@raycast/api";
import { Icon } from "@raycast/api";

export const iconsMap: Map<string, IconType> = new Map([
  ["digits", Icon.Coin],
  ["characters", Icon.Lowercase],
  ["email", Icon.Envelope],
  ["password", Icon.Fingerprint],
  ["url", Icon.Globe],
  ["ip", Icon.Footprints],
  ["dates", Icon.Calendar],
  ["time", Icon.Clock],
  ["html", Icon.Code],
  ["filePath", Icon.Document],
  ["phone", Icon.Phone],
  ["zipcode", Icon.BarCode],
  ["payments", Icon.BankNote],
]);
