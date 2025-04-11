import { Icon, MenuBarExtra } from "@raycast/api";
import { getChargeThreshold, setBatteryThreshold } from "./utils";
import { usePromise } from "@raycast/utils";

export default function BatterOptimizerMenuBar() {
  const {
    isLoading,
    data: chargingThreshold,
    revalidate,
  } = usePromise(async () => {
    try {
      return await getChargeThreshold();
    } catch {
      return "100";
    }
  });

  // Currently, bclm only supports 80 and 100 as charging thresholds.
  const batteryOptimizerEnabled = chargingThreshold === "80";

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={batteryOptimizerEnabled ? Icon.BatteryDisabled : Icon.BatteryCharging}
      tooltip="Batter Optimizer"
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`🔋 Charging Threshold：${chargingThreshold}%`} />
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
