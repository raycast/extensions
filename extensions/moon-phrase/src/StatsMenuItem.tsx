import { MenuBarExtra, Clipboard } from "@raycast/api";

const StatsMenuItem = (props: { label: string; value: string; icon: string }) => {
  return (
    <MenuBarExtra.Item
      title={props.label}
      subtitle={props.value}
      onAction={async () => {
        await Clipboard.copy(`${props.label}: ${props.value}`);
      }}
      icon={props.icon}
    />
  );
};

export default StatsMenuItem;
