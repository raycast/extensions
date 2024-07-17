import { Color, Icon, Image, List } from "@raycast/api";
import { Monitor } from "./types";
import useHetrixTools from "./use-hetrix-tools";

export default function UptimeMonitors() {
  const { isLoading, data: monitors, pagination } = useHetrixTools<Monitor>("uptime-monitors");

  function getUptimeColor(uptime: number) {
    if (uptime == 100) return Color.Green;
    return undefined;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search uptime monitor" pagination={pagination}>
      {monitors.map((monitor) => {
        const icon: Image.ImageLike =
          monitor.uptime_status === "up"
            ? { source: Icon.ArrowUp, tintColor: Color.Green }
            : { source: Icon.ArrowDown, tintColor: Color.Red };
        return (
          <List.Item
            key={monitor.id}
            icon={icon}
            title={monitor.name}
            subtitle={monitor.type}
            accessories={[
              { text: "Added" },
              { date: new Date(monitor.created_at * 1000) },
              { icon: Icon.Minus },
              { text: "Checked" },
              { date: new Date(monitor.last_check * 1000) },
              { tag: { value: `${monitor.uptime}%`, color: getUptimeColor(monitor.uptime) } },
            ]}
          />
        );
      })}
    </List>
  );
}
