import { setSurgeOutboundMode } from "./utils";

export default async function main() {
  await setSurgeOutboundMode("Direct");
}
