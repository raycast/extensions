import { Action, Icon } from "@raycast/api";
import { StatusPage } from "@/domain/status-page";
import { StatusPageDetail } from "@/ui/status-pages/status-page-detail";

interface ViewStatusPageDetailActionProps {
  statusPage: StatusPage & { url: string };
}

export function ViewStatusPageDetailAction({ statusPage }: ViewStatusPageDetailActionProps) {
  return (
    <Action.Push title="View Timeline" icon={Icon.BarChart} target={<StatusPageDetail statusPage={statusPage} />} />
  );
}
