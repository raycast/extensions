import { URLInfo } from "./types";
import QRCode from "qrcode";

export async function generateQRCode(url: string) {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 200,
    });
    return dataUrl;
  } catch (error) {
    return null;
  }
}

export function parseURL(url: string): URLInfo | null {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      host: urlObj.host,
      path: urlObj.pathname,
      query: urlObj.search,
      hash: urlObj.hash,
    };
  } catch {
    return null;
  }
}

export function validateUrl(url: string): boolean {
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  try {
    new URL(urlWithProtocol);
    return true;
  } catch {
    return false;
  }
}

export function uniqueId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 15);
}
