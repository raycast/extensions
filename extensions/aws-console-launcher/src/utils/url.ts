import { AwsService } from "../types";

export function buildConsoleUrl(service: AwsService, region: string): string {
  if (service.consoleUrl.startsWith("https://")) {
    return service.consoleUrl;
  }
  return `https://${region}.console.aws.amazon.com/${service.consoleUrl}`;
}
