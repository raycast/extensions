import { Action, Tool } from "@raycast/api";
import { getDdosProtectionMode, getServiceDetails, setDdosProtectionMode } from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
  /**
   * "block" actively mitigates detected attacks; "log" only records them
   * without blocking traffic.
   */
  mode: "log" | "block";
};

export const confirmation: Tool.Confirmation<Input> = async ({ serviceId, mode }) => {
  const [details, currentMode] = await Promise.all([getServiceDetails(serviceId), getDdosProtectionMode(serviceId)]);
  return {
    style: mode === "log" ? Action.Style.Destructive : undefined,
    message:
      mode === "log"
        ? "Switch DDoS Protection to log-only mode? Detected attacks will no longer be blocked."
        : "Switch DDoS Protection to block mode? Detected attack traffic will be actively mitigated.",
    info: [
      { name: "Service", value: details.name },
      { name: "Current mode", value: currentMode || "unknown" },
      { name: "New mode", value: mode },
    ],
  };
};

/**
 * Change the DDoS Protection mode for a service between "log" (observe only)
 * and "block" (actively mitigate attacks). DDoS Protection must already be
 * enabled on the service.
 */
export default async function ({ serviceId, mode }: Input) {
  await setDdosProtectionMode(serviceId, mode);
  return { serviceId, mode };
}
