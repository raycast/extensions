import { showFailureToast } from "@raycast/utils";
import * as common from "oci-common";

const KEYS: Record<string, string> = {
  ocpus: "OCPUs",
  gpus: "GPUs",
  maxVnicAttachments: "Max VNIC Attachments",
  vcpus: "VCPUs",
  baselineOcpuUtilization: "Baseline OCPU Utilization",

  macAddress: "MAC Address",
  privateIp: "Private IP",
  publicIp: "Public IP",
};

/**
 * Converts an object into a Markdown table format.
 *
 * @param title - The title of the Markdown table.
 * @param obj - The object to be converted; defaults to an empty object if not provided.
 * @returns A string representing the Markdown table.
 */
export function mapObjectToMarkdownTable(title: string, obj: { [key: string]: unknown } = {}) {
  return `${title} \n\n
| - | - |
|---|---|
${Object.entries(obj)
  .map(([key, val]) => `| ${KEYS[key] ?? key} | ${typeof val === "string" ? val : JSON.stringify(val)} |`)
  .join(`\n`)}`;
}

export const onError = async (error: Error) => {
  const err = error.message as string | common.OciError;
  const title = "ERROR";
  const message = err instanceof common.OciError ? err.message : err;
  await showFailureToast(message, { title });
};
