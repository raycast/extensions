const KEYS: Record<string, string> = {
  ocpus: "OCPUs",
  gpus: "GPUs",
  maxVnicAttachments: "Max VNIC Attachments",
  vcpus: "VCPUs",

  macAddress: "MAC Address",
  privateIp: "Private IP",
  publicIp: "Public IP",
};

export function mapObjectToMarkdownTable(title: string, obj: { [key: string]: unknown } = {}) {
  return `${title} \n\n
| - | - |
|---|---|
${Object.entries(obj)
  .map(([key, val]) => `| ${KEYS[key] ?? key} | ${typeof val === "string" ? val : JSON.stringify(val)} |`)
  .join(`\n`)}`;
}
