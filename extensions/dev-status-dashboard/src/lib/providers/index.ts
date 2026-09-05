import { awsProvider } from "./aws";
import { gcpProvider } from "./googlecloud";
import { slackProvider } from "./slack";
import { statuspageProvider } from "./statuspage";
import type { Service, StatusProvider } from "./types";

/** Resolves the provider for a service by its declared backend. */
export function providerFor(service: Service): StatusProvider {
  switch (service.provider) {
    case "slack":
      return slackProvider;
    case "gcp":
      return gcpProvider;
    case "aws":
      return awsProvider;
    case "statuspage":
    default:
      return statuspageProvider;
  }
}

export type { Service, ServiceStatus, Incident, Component, Indicator, StatusProvider } from "./types";
