import { Appearance, getSchedulePalette } from "@/common/colors";
import { StatusPageResource } from "@/domain/status-page-resource";
import { RESOURCE_STATUS_COLOR } from "@/ui/status-pages/status-colors";
import { TimelineBars } from "@/ui/status-pages/components/detail/timeline-bars";

interface ResourceRowProps {
  resource: StatusPageResource;
  appearance: Appearance;
}

export function ResourceRow({ resource, appearance }: ResourceRowProps) {
  const palette = getSchedulePalette(appearance);
  const dotColor = RESOURCE_STATUS_COLOR[resource.status][appearance];

  return (
    <div tw="flex flex-col w-[1112px]" style={{ gap: "8px" }}>
      <div tw="flex items-center justify-between">
        <div tw="flex items-center" style={{ gap: "8px" }}>
          <div tw={`flex w-[10px] h-[10px] rounded-full bg-[${dotColor}]`} />
          <span tw={`text-[18px] font-semibold text-[${palette.heading}]`}>{resource.name}</span>
        </div>
        <span tw={`text-[16px] font-semibold text-[${dotColor}]`}>{formatUptime(resource)}</span>
      </div>
      <TimelineBars history={resource.history} appearance={appearance} />
    </div>
  );
}

export function formatUptime(resource: StatusPageResource): string {
  return `${resource.availability.toFixed(3)}% uptime`;
}
