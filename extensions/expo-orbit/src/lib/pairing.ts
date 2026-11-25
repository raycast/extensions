import { z } from "zod";
import { runOrbit } from "./orbit";

const DEVICE_PAIRED_LOG = "[orbit] device paired";
const QR_CODE_LOG_PREFIX = "[orbit] qr-code ";
const SCAN_STARTED_LOG = "Pairing with ";
const QR_TIMEOUT_MS = 3 * 60 * 1000;

const pairResultSchema = z.object({
  success: z.boolean(),
  error: z.object({ code: z.string().optional(), message: z.string() }).optional(),
});

function assertPaired(output: string) {
  const result = pairResultSchema.parse(JSON.parse(output));
  if (!result.success) {
    throw new Error(result.error?.message ?? "Pairing failed");
  }
}

export type PairWithCodeOptions = {
  /** The `ip:port` shown under the pairing code. */
  pairingAddress: string;
  pairingCode: string;
  /** The `ip:port` on the Wireless debugging screen. Expo Orbit finds it over mDNS when it's left out. */
  connectAddress?: string;
};

/** Pairs and connects an Android device over Wi-Fi with the code it shows, like Expo Orbit's pairing window. */
export async function pairWithCode(options: PairWithCodeOptions, onPaired?: () => void): Promise<void> {
  const args = ["--mode", "code", "--pairing-address", options.pairingAddress, "--pairing-code", options.pairingCode];
  if (options.connectAddress) {
    args.push("--connect-address", options.connectAddress);
  }
  const output = await runOrbit("pair-android-device", args, {
    onOutput: (line) => {
      if (line.includes(DEVICE_PAIRED_LOG)) onPaired?.();
    },
  });
  assertPaired(output);
}

export type PairWithQrCodeOptions = {
  signal: AbortSignal;
  /** Receives the payload to show as a QR code, e.g. `WIFI:T:ADB;S:…;P:…;;`. Orbit creates the secret. */
  onQrCode: (payload: string) => void;
  onScanned?: () => void;
};

/** Waits for an Android device to scan a pairing QR code, then pairs and connects it. */
export async function pairWithQrCode({ signal, onQrCode, onScanned }: PairWithQrCodeOptions): Promise<void> {
  const output = await runOrbit("pair-android-device", ["--mode", "qr", "--timeout", String(QR_TIMEOUT_MS)], {
    signal,
    onOutput: (line) => {
      const index = line.indexOf(QR_CODE_LOG_PREFIX);
      if (index !== -1) {
        onQrCode(line.slice(index + QR_CODE_LOG_PREFIX.length).trim());
      } else if (line.startsWith(SCAN_STARTED_LOG)) {
        onScanned?.();
      }
    },
  });
  assertPaired(output);
}
