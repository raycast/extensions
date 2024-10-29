import { JobStatusResponse } from "../types/printer_status";

export default function markdownBuilder(status: JobStatusResponse): string {
  return `
# OctoPrint ${status.state}
`;
}
