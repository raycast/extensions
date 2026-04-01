import { CloudRegion } from "../types/application";

const regionLabels: Record<CloudRegion, string> = {
  "us-east-2": "US East (Ohio)",
  "us-east-1": "US East (N. Virginia)",
  "eu-central-1": "EU (Frankfurt)",
  "eu-west-1": "EU (Ireland)",
  "eu-west-2": "EU (London)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ca-central-1": "Canada (Central)",
  "me-central-1": "Middle East (UAE)",
};

export function getRegionLabel(region: CloudRegion): string {
  return regionLabels[region] || region;
}
