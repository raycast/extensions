import { Monitor, Assertion } from "../types";
import { STATUS_COLORS } from "../constants";

export function getEffectiveStatus(monitor: Monitor): string {
  if (monitor.paused) {
    return "paused";
  }
  return monitor.status;
}

export function getStatusColor(status: string): string {
  return (
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.paused
  );
}

export function groupMonitorsByStatus(monitors: Monitor[]): {
  [key: string]: Monitor[];
} {
  const grouped: { [key: string]: Monitor[] } = {
    Online: [],
    Offline: [],
    Paused: [],
    Partial: [],
    Fetching: [],
    Other: [],
  };

  monitors.forEach((monitor) => {
    const effectiveStatus = getEffectiveStatus(monitor);
    switch (effectiveStatus) {
      case "online":
        grouped.Online.push(monitor);
        break;
      case "offline":
        grouped.Offline.push(monitor);
        break;
      case "paused":
        grouped.Paused.push(monitor);
        break;
      case "partial":
        grouped.Partial.push(monitor);
        break;
      case "fetching":
        grouped.Fetching.push(monitor);
        break;
      default:
        grouped.Other.push(monitor);
        break;
    }
  });

  Object.keys(grouped).forEach((key) => {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
}

export function formatSuccessAssertions(assertions: Assertion[]): string {
  return assertions
    .map((a: Assertion) => `${a.type} ${a.operator} ${a.value}`)
    .join(", ");
}

// Form data transformation
export function transformFormDataToMonitor(values: {
  name: string;
  url: string;
  method: string;
  interval: string;
  timeout: string;
  regions: string[];
  incidentConfirmations: string;
  recoveryConfirmations: string;
  followRedirects: boolean;
  tlsSkipVerify: boolean;
  keyword: string;
  userAgentSecret: string;
  statusCodeAssertion: string;
}) {
  return {
    name: values.name,
    protocol: "http",
    request: {
      method: values.method.toUpperCase(),
      url: values.url,
      tls_skip_verify: values.tlsSkipVerify,
      follow_redirects: values.followRedirects,
      ...(values.keyword && { keyword: values.keyword }),
      ...(values.userAgentSecret && {
        user_agent_secret: values.userAgentSecret,
      }),
    },
    interval: parseInt(values.interval),
    timeout: parseInt(values.timeout),
    success_assertions: [
      {
        type: "status_code",
        operator: "in",
        value: values.statusCodeAssertion || "2xx,30x",
      },
    ],
    incident_confirmations: parseInt(values.incidentConfirmations),
    recovery_confirmations: parseInt(values.recoveryConfirmations),
    regions: values.regions,
  };
}
