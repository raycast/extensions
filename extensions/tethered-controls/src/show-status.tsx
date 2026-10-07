import { Action, ActionPanel, Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
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
  return (
    typeof status.request === "string" &&
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
    typeof status.activeProfile === "string"
  );
}

async function requestStatus(): Promise<Status> {
  const request = crypto.randomUUID();
  await sendToTethered(`tethered://status?request=${request}`);
  for (let attempt = 0; attempt < 60; attempt++) {
    const value = await readStoredData("raycastStatus").catch(() => undefined);
    if (isStatus(value) && value.request === request) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Tethered did not return a fresh status. Open the updated app and try again.");
}

let pendingStatusRequest: Promise<Status> | undefined;

function requestStatusOnce(): Promise<Status> {
  if (pendingStatusRequest) return pendingStatusRequest;
  pendingStatusRequest = requestStatus();
  void pendingStatusRequest.then(
    () => {
      pendingStatusRequest = undefined;
    },
    () => {
      pendingStatusRequest = undefined;
    },
  );
  return pendingStatusRequest;
}

async function requestFreshStatus(): Promise<Status> {
  await pendingStatusRequest?.catch(() => undefined);
  return requestStatusOnce();
}

const yesNo = (value: boolean) => (value ? "On" : "Off");
const powerModeLabel = (value: string) =>
  (({ auto: "Auto", low: "Low", high: "High" }) as Record<string, string>)[value] ?? value;
const calibrationLabel = (value: string) =>
  (({ opportunityWaitingForNaturalFull: "Waiting for opportunity" }) as Record<string, string>)[value] ?? value;
const escapeMarkdown = (value: string) =>
  Array.from(
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, " "),
    (character) => ("\\`*_{}[]()#+-.!|~".includes(character) ? `\\${character}` : character),
  ).join("");

export default function Command() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refreshStatus = useCallback(async (forceNew = false) => {
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setStatus(null);
    setErrorMessage(null);
    try {
      const latestStatus = await (forceNew ? requestFreshStatus() : requestStatusOnce());
      if (sequence === requestSequence.current) setStatus(latestStatus);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      const detail = error instanceof Error ? error.message : String(error);
      setErrorMessage(detail);
      await showFailureToast(error, { title: "Could not read Tethered status" });
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const markdown = status
    ? [
        `# Tethered Status`,
        `Battery: ${status.batteryLevel < 0 ? "Unavailable" : `${Math.round(status.batteryLevel)}%`} (${status.isACConnected ? "AC" : "Battery"}, ${status.isCharging ? "Charging" : "Not charging"})`,
        `Power mode: ${powerModeLabel(status.powerMode)}`,
        `Caffeinate: ${yesNo(status.caffeinateActive)}`,
        `Calibration: ${calibrationLabel(status.calibrationPhase)}`,
        `Topup: ${yesNo(status.topupEnabled)}`,
        `Sailing: ${yesNo(status.sailingEnabled)} (active: ${yesNo(status.sailingActive)})`,
        `Heat Protection: ${yesNo(status.heatProtectionEnabled)} (active: ${yesNo(status.heatProtectionActive)})`,
        `Profile: ${status.activeProfile ? escapeMarkdown(status.activeProfile) : "None"}`,
        `Updated: ${new Date(status.updatedAt * 1000).toLocaleTimeString()}`,
      ].join("\n\n")
    : errorMessage
      ? `Could not read Tethered status: ${escapeMarkdown(errorMessage)}`
      : "Waiting for Tethered status…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Status" onAction={() => refreshStatus(true)} />
        </ActionPanel>
      }
    />
  );
}
