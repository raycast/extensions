import { listConnections } from "../api";

export default async function tool() {
  const accounts = await listConnections();
  return accounts.map((c) => ({
    connectionId: c.id,
    platform: c.platform,
    handle: c.handle,
    name: c.displayName,
  }));
}
