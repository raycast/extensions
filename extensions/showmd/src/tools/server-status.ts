import { loadManageStatus } from "../lib/raycast-glue";
import { labelForServer } from "../lib/showmd";

export default async function tool(): Promise<{
  running: boolean;
  version?: string;
  label: string;
  instances: number;
}> {
  const status = await loadManageStatus();
  const primary = status.servers[0];
  const label = primary ? labelForServer(primary) : "none";
  return {
    running: status.running,
    version: primary?.version,
    label,
    instances: status.servers.length,
  };
}
