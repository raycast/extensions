import { Application } from "./internal-models";

export function formatSubtitle(application: Application): string {
  return application.bundleId || application.hostname || "";
}
