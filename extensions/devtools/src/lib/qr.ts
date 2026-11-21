import { runAppleScript } from "@raycast/utils";
import QRCode from "qrcode";
import { qrDecoderScript } from "./qr-decoder-script";

export function generateQr(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { width: 512, margin: 4, errorCorrectionLevel: "M" });
}

export async function decodeClipboardQr(): Promise<string[]> {
  const result = await runAppleScript<{ codes: string[]; error?: string }>(qrDecoderScript, {
    language: "JavaScript",
    timeout: 15_000,
    parseOutput: ({ stdout, error, exitCode, timedOut }) => {
      if (timedOut) throw new Error("QR decoding timed out.");
      if (error || exitCode !== 0) throw error ?? new Error("QR decoding failed.");
      return JSON.parse(stdout);
    },
  }).catch((cause: Error) => {
    throw new Error(
      /timed out|SIGTERM/i.test(cause.message)
        ? "QR decoding timed out. Try a smaller image."
        : "Unable to decode QR codes. Try a clearer image.",
    );
  });
  if (result.error) throw new Error(result.error);
  return result.codes;
}
