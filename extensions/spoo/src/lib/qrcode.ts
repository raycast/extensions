import QRCode from "qrcode";
import { environment } from "@raycast/api";

export const QR_DARK = "#2E1A47";
export const QR_LIGHT = "#FFFFFF";
export const QR_TRANSPARENT = "#00000000";

export type Appearance = "light" | "dark";

export async function toDataUrl(
  text: string,
  size = 320,
  transparent = false,
  appearance?: Appearance,
): Promise<string> {
  const isDark = (appearance ?? environment.appearance) === "dark";
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: transparent ? (isDark ? QR_LIGHT : QR_DARK) : QR_DARK,
      light: transparent ? QR_TRANSPARENT : QR_LIGHT,
    },
  });
}

export function markdownImage(dataUrl: string, alt = "QR code"): string {
  return `![${alt}](${dataUrl})`;
}
