import { Action, Icon, useNavigation } from "@raycast/api";
import { Monitor } from "@/domain/monitor";
import { MonitorDetail } from "@/ui/monitors/monitor-detail";
import { prerenderMonitorDetailImages } from "@/ui/monitors/monitor-detail-renderer";

interface ViewMonitorDetailActionProps {
  monitor: Monitor & { webUrl: string };
}

/** Opens the detail only once its images are ready, so its first frame is never half-drawn. */
export function ViewMonitorDetailAction({ monitor }: ViewMonitorDetailActionProps) {
  const { push } = useNavigation();

  const openDetail = async () => {
    const images = await prerenderMonitorDetailImages(monitor);
    push(<MonitorDetail monitor={monitor} images={images} />);
  };

  return <Action title="View Details" icon={Icon.Eye} onAction={openDetail} />;
}
