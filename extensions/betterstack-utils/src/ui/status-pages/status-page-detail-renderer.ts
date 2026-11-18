import { environment } from "@raycast/api";
import { StatusPage } from "@/domain/status-page";
import { StatusPageSectionGroup } from "@/domain/status-page-resource";
import { toImageDataUri } from "@/common/utils/svg-utils";
import { buildStatusPageDetailSvg } from "@/ui/status-pages/components/detail/status-page-detail-view";

interface StatusPageDetailData {
  statusPage: StatusPage;
  sections: StatusPageSectionGroup[];
  isLoading: boolean;
}

const EMPTY_STATE_MARKDOWN = "No resources are published on this status page.";

export async function renderStatusPageDetail(data: StatusPageDetailData): Promise<string> {
  const { statusPage, sections, isLoading } = data;
  if (isLoading) return "";
  if (sections.length === 0) return EMPTY_STATE_MARKDOWN;

  const svg = await buildStatusPageDetailSvg({ statusPage, sections });
  return `![status page](${await toImageDataUri(svg, environment.supportPath, environment.raycastVersion)})`;
}
