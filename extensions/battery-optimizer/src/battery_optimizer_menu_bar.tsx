import { Icon, MenuBarExtra } from "@raycast/api";
import { getChargeThreshold, setBatteryThreshold } from "./utils";
import { usePromise } from "@raycast/utils";
import { getBatteryTool } from "./utils/batteryTools";

export default function BatteryOptimizerMenuBar() {
  const {
    isLoading,
    data: chargingThreshold,
    revalidate,
  } = usePromise(async () => {
    try {
      return await getChargeThreshold();
    } catch {
      return 100;
    }
  });

  // Both BCLM and BATT support 80% as standard battery optimization threshold
  const batteryOptimizerEnabled = chargingThreshold === 80;
  const batteryTool = getBatteryTool();

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={batteryOptimizerEnabled ? Icon.BatteryDisabled : Icon.BatteryCharging}
      tooltip={`Battery Optimizer (${batteryTool.toUpperCase()})`}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`🔋 Charging Threshold: ${chargingThreshold}%`} />
        <MenuBarExtra.Item title={`Using: ${batteryTool.toUpperCase()}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {batteryOptimizerEnabled ? (
          <MenuBarExtra.Item
            title={`Disable Battery Optimizer`}
            onAction={async () => {
              await setBatteryThreshold(100);
              revalidate();
            }}
          />
        ) : (
          <MenuBarExtra.Item
            title={`Enable Battery Optimizer`}
            onAction={async () => {
              await setBatteryThreshold(80);
              revalidate();
            }}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
