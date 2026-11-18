import type { Phone, PhoneOverview } from "../lib/types";

const steps: Record<Phone["step"], string> = {
  ready: "Ready",
  trust: "Unlock the iPhone and tap Trust",
  unlock: "Unlock the iPhone by hand",
  usbUnreadable: "Check the USB connection in Ghosthand setup",
  bluetoothUnavailable: "Enable Bluetooth and permissions in Ghosthand setup",
  pair: "Pair this Mac in iPhone Settings → Bluetooth",
  connecting: "Waiting for Bluetooth to reconnect",
  developerMode: "Complete the existing XCTest setup in Ghosthand",
  xctestStarting: "WebDriverAgent is starting",
  xctestFailed: "Check the XCTest error in Ghosthand setup",
};

export function deviceStatus(phone: Phone): string {
  return phone.lease ? "Busy" : (steps[phone.step] ?? `Setup required: ${phone.step}`);
}

export function canControl(phone: Phone, overview: PhoneOverview): boolean {
  return (
    phone.step === "ready" && !!phone.captureId && !phone.lease && !phone.mac && overview.account.state === "signed-in"
  );
}

export function lockStatus(phone: Phone): string {
  if (phone.step === "unlock") return "Locked";
  if (phone.step === "ready") return "Unlocked";
  return "Unknown — complete setup";
}

export function setupStep(phone: Phone): string {
  return steps[phone.step] ?? `Complete Ghosthand setup (${phone.step})`;
}

/** Render device, OCR, and task text literally; never load images embedded in model output. */
export function markdownText(text: string): string {
  return text.replace(/([\\`*_[\]{}<>#+\-.!|])/g, "\\$1");
}
