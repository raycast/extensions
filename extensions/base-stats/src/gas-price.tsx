import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useGasPrice } from "./hook/useGasPrice";

export default function Command() {
  const { data, isLoading, error } = useGasPrice({ includeUnit: true });

  return (
    <MenuBarExtra
      icon={error ? Icon.ExclamationMark : "base.png"}
      title={data || ""}
      tooltip={error?.message}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={error ? "Open Settings" : "Settings"}
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
