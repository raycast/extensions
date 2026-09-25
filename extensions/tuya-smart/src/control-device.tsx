import { LaunchProps, showHUD } from "@raycast/api";
import { loadDevicesWithFallback, controlDevice } from "./utils/deviceSource";
import { findDeviceByExactName, findDeviceByName, matchingDevices } from "./utils/deviceLookup";
import { cleanName } from "./utils/deviceSemantics";
import { Device } from "./utils/interfaces";
import { parseRequest, resolveCommand } from "./utils/deviceIntent";
import { describeError } from "./utils/functions";

/**
 * Controls one device from a deeplink, so Apple Shortcuts and Siri can reach the same
 * devices the list does. A no-view command has no window for a toast, so every outcome,
 * including a refusal, is reported through the HUD.
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.ControlDevice }>) {
  const { query, action, switchName } = props.arguments;

  try {
    const request = parseRequest(query, action);

    if (request.unknownAction) {
      await showHUD(`Unknown action "${request.unknownAction}". Use on, off, stop or toggle.`);
      return;
    }
    if (request.candidates.every((candidate) => !candidate.name)) {
      await showHUD("Name a device to control.");
      return;
    }

    const { devices } = await loadDevicesWithFallback();

    // The readings are ordered, so the first that names a real device wins.
    const match = request.candidates
      .map((candidate) => ({
        candidate,
        device: candidate.exactOnly
          ? findDeviceByExactName(devices, candidate.name)
          : findDeviceByName(devices, candidate.name),
      }))
      .find((attempt) => attempt.device);

    if (!match?.device) {
      // Report the miss against the reading a person actually typed a name into.
      const best = request.candidates.find((candidate) => !candidate.exactOnly) ?? request.candidates[0];
      await showHUD(describeMiss(devices, best.name));
      return;
    }

    const { device } = match;
    const resolution = resolveCommand(device, match.candidate.intent, switchName);
    if (resolution.kind === "refused") {
      await showHUD(resolution.reason);
      return;
    }

    const transport = await controlDevice(device, resolution.command);
    const via = transport === "local" ? " (over the local network)" : "";
    await showHUD(`${resolution.describe}${via}`);
  } catch (error) {
    await showHUD(describeError(error));
  }
}

/**
 * Names overlap heavily in a Tuya account, so an unresolved name says what it matched
 * rather than acting on whichever came first. `describeDeviceMiss` says the same thing to
 * an assistant, which can go and call another tool; a person reading a HUD cannot, so the
 * wording differs and the list is capped to what a HUD will actually show.
 */
function describeMiss(devices: Device[], query: string): string {
  const matches = matchingDevices(devices, query);
  if (matches.length === 0) {
    return `No device called "${query}".`;
  }

  const names = matches.map((device) => cleanName(device.name));
  const shown = names.slice(0, 4).join(", ");
  const rest = names.length > 4 ? ` and ${names.length - 4} more` : "";
  return `"${query}" matches ${matches.length} devices: ${shown}${rest}. Use a more specific name.`;
}
