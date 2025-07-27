import { LaunchProps, PopToRootType, showHUD } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./utils/constants";

export default function SetTemperature(props: LaunchProps) {
  const extruderTemp = parseInt(props.arguments.extruder_temp);
  const bedTemp = parseInt(props.arguments.bed_temp);

  // Set extruder temp
  useFetch(ENDPOINTS.setToolTemp, {
    headers: HEADERS,
    method: "POST",
    body: JSON.stringify({
      command: "target",
      targets: {
        tool0: extruderTemp,
      },
    }),
    async onError() {
      await showHUD("🚫 Failed to set extruder temperature 🌡️", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    },
  });

  // Set bed temp
  useFetch(ENDPOINTS.setBedTemp, {
    headers: HEADERS,
    method: "POST",
    body: JSON.stringify({
      command: "target",
      target: bedTemp,
    }),
    async onError() {
      await showHUD("🚫 Failed to set bed temperature 🌡️", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    },
    // If success then down here
    async onData() {
      await showHUD("✅ Temperature set successfully 🌡️", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    },
  });
}
