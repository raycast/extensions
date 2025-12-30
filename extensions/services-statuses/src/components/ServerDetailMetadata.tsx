import { Detail, Icon } from "@raycast/api";
import { ServerConfig, ServerStatus } from "../types";

interface ServerDetailMetadataProps {
  server: ServerConfig;
  status: ServerStatus;
  isHealthy: boolean;
  healthyCount: number;
  totalCount: number;
  totalMemory: number;
  totalCPU: number;
  totalRestarts: number;
}

export function ServerDetailMetadata({
  server,
  status,
  isHealthy,
  healthyCount,
  totalCount,
  totalMemory,
  totalCPU,
  totalRestarts,
}: ServerDetailMetadataProps) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Status"
        icon={isHealthy ? Icon.CheckCircle : Icon.XMarkCircle}
        text={isHealthy ? "Healthy" : "Unhealthy"}
      />
      <Detail.Metadata.Separator />
      {server.host && server.host !== "N/A" && (
        <>
          <Detail.Metadata.Label title="Host" text={server.host} />
          {server.user && <Detail.Metadata.Label title="User" text={server.user} />}
          {server.port && <Detail.Metadata.Label title="Port" text={server.port.toString()} />}
        </>
      )}
      {server.healthCheckUrl && (
        <Detail.Metadata.Link title="Health Check URL" target={server.healthCheckUrl} text={server.healthCheckUrl} />
      )}
      {server.project && <Detail.Metadata.Label title="Project" text={server.project} />}
      <Detail.Metadata.Separator />
      {status.processes.length > 0 && (
        <>
          <Detail.Metadata.Label title="Services" text={`${healthyCount}/${totalCount} online`} />
          <Detail.Metadata.Label title="Total Memory" text={`${totalMemory.toFixed(0)} MB`} />
          <Detail.Metadata.Label title="Total CPU" text={`${totalCPU.toFixed(1)}%`} />
          <Detail.Metadata.Label title="Total Restarts" text={totalRestarts.toString()} />
        </>
      )}
      {status.healthCheck && status.healthCheck.httpCode && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="HTTP Status"
            text={status.healthCheck.httpCode.toString()}
            icon={
              status.healthCheck.httpCode >= 200 && status.healthCheck.httpCode < 300
                ? Icon.CheckCircle
                : Icon.XMarkCircle
            }
          />
        </>
      )}
    </Detail.Metadata>
  );
}
