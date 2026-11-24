import QRCode from "qrcode";
import { qrPath } from "./config";

/**
 * Writes the QR code for the current address into the support directory. The running service serves that file
 * at `/qr.png`, which gives the panel an image URL Raycast can render without any local-file support.
 */
export async function writeQrCode(address: string): Promise<void> {
  // Small on purpose: the panel shows it inline next to the address, not as a full-page poster.
  await QRCode.toFile(qrPath(), address, { margin: 1, width: 256 });
}

export function qrImageUrl(address: string): string {
  return `${address.replace(/\/+$/, "")}/qr.png`;
}
