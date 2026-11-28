import { showToast, Toast } from "@raycast/api";
import { type IOType, errorMessage, getDeviceState, setDefaultDevice } from "./audio-device";
import {
  getConnectOverrides,
  getDeviceMeta,
  getHiddenDevices,
  getPriorityList,
  recordCurrentDevice,
} from "./device-preferences";
import { launchAutoSwitch } from "./launch-auto-switch";
import { switchOnConnectUids } from "./priority/connect-mode";
import { cycleCandidates, nextDevice } from "./priority/cycle";
import { displayName } from "./priority/meta";
import { reconcile } from "./priority/list";

/** Switch to the next connected, non-hidden device with a priority or "Switch on Connect", wrapping around. */
export async function runCycle(type: IOType) {
  const label = type === "input" ? "Input" : "Output";

  try {
    const { devices, current } = await getDeviceState(type);
    const refs = devices.map((d) => ({ uid: d.uid, name: d.name }));

    const priorities = reconcile(await getPriorityList(type), refs);
    const onConnect = switchOnConnectUids(type, devices, await getConnectOverrides(type), priorities);
    const candidates = cycleCandidates(priorities, refs, await getHiddenDevices(type), onConnect);
    const target = current && nextDevice(candidates, current.uid);
    const device = target && devices.find((d) => d.uid === target.uid);

    if (!target || !device) {
      await showToast(
        Toast.Style.Failure,
        `Nothing to cycle`,
        `Give at least two connected ${type} devices a priority or Switch on Connect.`,
      );
      return;
    }

    await setDefaultDevice(type, device.id);
    // A deliberate choice: tell Auto Switch so it is not undone on the next run.
    await recordCurrentDevice(type, device.uid);

    const name = displayName(device.name, (await getDeviceMeta(type))[device.uid]);
    // The toast shows the title on top and the message below: label first, device name underneath.
    await showToast(Toast.Style.Success, `${label} Device`, name);
    // Refreshes the Enable Auto Switch subtitle (devices in use); the manual choice itself is kept.
    await launchAutoSwitch("silent");
  } catch (error) {
    console.error(`Cycle ${type} failed:`, error);
    await showToast(Toast.Style.Failure, `Could not cycle the ${type} device`, errorMessage(error));
  }
}
