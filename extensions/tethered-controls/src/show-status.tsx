import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readStoredData } from "./read-stored-items";
import { sendToTethered } from "./send-to-tethered";

type Status = {
  request: string;
  updatedAt: number;
  batteryLevel: number;
  isCharging: boolean;
  isACConnected: boolean;
  powerMode: string;
  caffeinateActive: boolean;
  calibrationPhase: string;
  topupEnabled: boolean;
  sailingEnabled: boolean;
  sailingActive: boolean;
  heatProtectionEnabled: boolean;
  heatProtectionActive: boolean;
  activeProfile: string;
};

function isStatus(value: unknown): value is Status {
  if (typeof value !== "object" || value === null) return false;
  const status = value as Record<string, unknown>;
  return typeof status.request === "string" &&
    typeof status.updatedAt === "number" &&
    typeof status.batteryLevel === "number" &&
    typeof status.isCharging === "boolean" &&
    typeof status.isACConnected === "boolean" &&
    typeof status.powerMode === "string" &&
    typeof status.caffeinateActive === "boolean" &&
    typeof status.calibrationPhase === "string" &&
    typeof status.topupEnabled === "boolean" &&
    typeof status.sailingEnabled === "boolean" &&
    typeof status.sailingActive === "boolean" &&
    typeof status.heatProtectionEnabled === "boolean" &&
    typeof status.heatProtectionActive === "boolean" &&
    typeof status.activeProfile === "string";
}

async function requestStatus(): Promise<Status> {
  const request = crypto.randomUUID();
  await sendToTethered(`tethered://status?request=${request}`);
  for (let attempt = 0; attempt < 20; attempt++) {
    const value = await readStoredData("raycastStatus");
    if (isStatus(value) && value.request === request) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Tethered did not return a fresh status. Open the updated app and try again.");
}

const yesNo = (value: boolean) => value ? "On" : "Off";

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void requestStatus().then(setStatus).catch(async (error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      await showToast({ style: Toast.Style.Failure, title: "Could not read Tethered status", message: detail });
    }).finally(() => setIsLoading(false));
  }, []);

  const markdown = status ? [
    `# Tethered Status`,
    `Battery: ${status.batteryLevel < 0 ? "Unavailable" : `${Math.round(status.batteryLevel)}%`} (${status.isACConnected ? "AC" : "Battery"}, ${status.isCharging ? "Charging" : "Not charging"})`,
    `Power mode: ${status.powerMode}`,
    `Caffeinate: ${yesNo(status.caffeinateActive)}`,
    `Calibration: ${status.calibrationPhase}`,
    `Topup: ${yesNo(status.topupEnabled)}`,
    `Sailing: ${yesNo(status.sailingEnabled)} (active: ${yesNo(status.sailingActive)})`,
    `Heat Protection: ${yesNo(status.heatProtectionEnabled)} (active: ${yesNo(status.heatProtectionActive)})`,
    `Profile: ${status.activeProfile || "None"}`,
    `Updated: ${new Date(status.updatedAt * 1000).toLocaleTimeString()}`,
  ].join("\n\n") : "Waiting for Tethered status…";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
