import { environment } from "@raycast/api";
import { Appearance, getSchedulePalette } from "@/common/colors";
import { capitalize } from "@/common/utils/string-utils";
import { StatusPage } from "@/domain/status-page";
import { StatusPageSectionGroup } from "@/domain/status-page-resource";
import { renderToSvg } from "@/ui/svg-renderer";
import { RESOURCE_STATUS_COLOR, STATE_COLOR } from "@/ui/status-pages/status-colors";
import { SectionBlock } from "@/ui/status-pages/components/detail/section-block";
import { formatUptime } from "@/ui/status-pages/components/detail/resource-row";
import { TimelineBars } from "@/ui/status-pages/components/detail/timeline-bars";
import { cn } from "@/lib/utils";

interface StatusPageDetailViewProps {
  statusPage: StatusPage;
  sections: StatusPageSectionGroup[];
  forExport?: boolean;
}

export async function buildStatusPageDetailSvg(props: StatusPageDetailViewProps): Promise<string> {
  return renderToSvg(<StatusPageDetailView {...props} />);
}

function StatusPageDetailView({ statusPage, sections, forExport = false }: StatusPageDetailViewProps) {
  const appearance: Appearance = forExport ? Appearance.DARK : environment.appearance;
  const backgroundColor = forExport ? "bg-dark" : "";
  const palette = getSchedulePalette(appearance);
  const badgeColor = STATE_COLOR[statusPage.state][appearance];
  const resources = sections.flatMap((section) => section.resources);
  const singleResource = resources.length === 1 ? resources[0] : undefined;

  return (
    <div tw={cn("flex flex-col w-[1160px] p-[24px]", backgroundColor)} style={{ gap: "32px" }}>
      <div tw="flex items-center justify-between w-[1112px]">
        <div tw="flex items-center" style={{ gap: "16px" }}>
          {/* 24px so the pulseAnimation post-processor adds the animated rings */}
          <div tw={`flex w-[24px] h-[24px] rounded-full bg-[${badgeColor}]`} />
          <span tw={`text-[24px] font-bold text-[${palette.heading}]`}>{statusPage.name}</span>
          {singleResource && (
            <span tw={`text-[24px] font-semibold text-[${palette.heading}]`}>{singleResource.name}</span>
          )}
        </div>
        <div tw="flex items-center" style={{ gap: "16px" }}>
          {singleResource && (
            <span tw={`text-[16px] font-semibold text-[${RESOURCE_STATUS_COLOR[singleResource.status][appearance]}]`}>
              {formatUptime(singleResource)}
            </span>
          )}
          <span tw={`text-[16px] font-semibold text-[${badgeColor}]`}>{capitalize(statusPage.state)}</span>
        </div>
      </div>
      {singleResource ? (
        <TimelineBars history={singleResource.history} appearance={appearance} />
      ) : (
        sections.map((section) => <SectionBlock key={section.id} section={section} appearance={appearance} />)
      )}
    </div>
  );
}
