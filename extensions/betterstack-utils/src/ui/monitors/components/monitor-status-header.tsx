import { environment } from "@raycast/api";
import { Appearance, getSchedulePalette } from "@/common/colors";
import { Monitor } from "@/domain/monitor";
import { MONITOR_STATUS_COLOR } from "@/ui/monitors/monitor-status";
import { renderToSvg } from "@/ui/svg-renderer";

export const MONITOR_STATUS_HEADER_HEIGHT = 48;

export async function buildMonitorStatusHeaderSvg(monitor: Monitor): Promise<string> {
  return renderToSvg(<MonitorStatusHeader monitor={monitor} />);
}

function MonitorStatusHeader({ monitor }: { monitor: Monitor }) {
  const appearance: Appearance = environment.appearance;
  const palette = getSchedulePalette(appearance);
  const color = MONITOR_STATUS_COLOR[monitor.status][appearance];

  return (
    <div tw={`flex items-center w-[1160px] h-[${MONITOR_STATUS_HEADER_HEIGHT}px]`}>
      <div tw={`w-[24px] h-[24px] rounded-full bg-[${color}]`} />
      <span tw={`text-[24px] font-bold pl-4 text-[${palette.heading}]`}>{monitor.name}</span>
    </div>
  );
}
