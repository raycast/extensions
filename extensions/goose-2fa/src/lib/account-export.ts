import QRCode from "qrcode";
import { exportAsUris } from "../../vendor/lib/data-transfer";
import type { AccountData } from "../../vendor/lib/types";

export function accountSetupUri(account: AccountData): string {
  // The Key URI label reserves ASCII colons for the issuer/account separator.
  return exportAsUris([
    {
      ...account,
      name: account.name.replace(/:/g, "："),
      issuer: account.issuer.replace(/:/g, "："),
    },
  ]);
}

export function accountQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 8,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
