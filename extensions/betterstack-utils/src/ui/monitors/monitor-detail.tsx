import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Monitor } from "@/domain/monitor";
import { useMonitorAvailability } from "@/hooks/use-monitor-availability";
import {
  buildMonitorDetailMarkdown,
  MonitorDetailImages,
  renderMonitorAvailability,
} from "@/ui/monitors/monitor-detail-renderer";
import { MonitorActionPanel } from "@/ui/monitors/action-panel/monitor-action-panel";

const queryClient = new QueryClient();

interface MonitorDetailProps {
  monitor: Monitor & { webUrl: string };
  images: MonitorDetailImages;
}

export function MonitorDetail({ monitor, images }: MonitorDetailProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MonitorDetailContent monitor={monitor} images={images} />
    </QueryClientProvider>
  );
}

function MonitorDetailContent({ monitor, images }: MonitorDetailProps) {
  const { periods, isLoading, isError, refresh } = useMonitorAvailability(monitor.id, monitor.createdAt);
  const [availabilityMarkdown, setAvailabilityMarkdown] = useState(images.availabilitySkeletonMarkdown);

  useEffect(() => {
    renderMonitorAvailability(monitor, { periods, isLoading, isError })
      .then(setAvailabilityMarkdown)
      .catch(() => setAvailabilityMarkdown("_Failed to render availability data._"));
  }, [monitor, periods, isLoading, isError]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={monitor.name}
      markdown={buildMonitorDetailMarkdown(monitor, images, availabilityMarkdown)}
      actions={<MonitorActionPanel webUrl={monitor.webUrl} onRefresh={refresh} />}
    />
  );
}
