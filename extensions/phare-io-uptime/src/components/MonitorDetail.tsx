import { List, Icon } from "@raycast/api";
import { Monitor } from "../types";
import {
  formatSuccessAssertions,
  getStatusColor,
  getEffectiveStatus,
} from "../utils/monitorUtils";

interface MonitorDetailProps {
  monitor: Monitor;
}

export function MonitorDetail({ monitor }: MonitorDetailProps) {
  const effectiveStatus = getEffectiveStatus(monitor);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={effectiveStatus}
              color={getStatusColor(effectiveStatus)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Protocol"
            text={monitor.protocol.toUpperCase()}
            icon={monitor.protocol === "https" ? Icon.Lock : Icon.Globe}
          />
          <List.Item.Detail.Metadata.Label
            title="Method"
            text={monitor.request.method}
          />
          <List.Item.Detail.Metadata.Label
            title="URL"
            text={monitor.request.url}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Response Time"
            text={`${monitor.response_time}ms`}
            icon={Icon.Clock}
          />
          <List.Item.Detail.Metadata.Label
            title="Regions"
            text={monitor.regions.join(", ")}
          />
          <List.Item.Detail.Metadata.Label
            title="Interval"
            text={`${monitor.interval}s`}
          />
          <List.Item.Detail.Metadata.Label
            title="Timeout"
            text={`${monitor.timeout}ms`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Incident Confirmations"
            text={String(monitor.incident_confirmations)}
          />
          <List.Item.Detail.Metadata.Label
            title="Recovery Confirmations"
            text={String(monitor.recovery_confirmations)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Follow Redirects"
            text={monitor.request.follow_redirects ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Label
            title="TLS Skip Verify"
            text={monitor.request.tls_skip_verify ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Label
            title="Success Assertions"
            text={formatSuccessAssertions(monitor.success_assertions)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={new Date(monitor.created_at).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={new Date(monitor.updated_at).toLocaleString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
