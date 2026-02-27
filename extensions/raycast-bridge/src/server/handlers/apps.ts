import http from "http";
import { getApplications } from "@raycast/api";
import { ok, fail } from "../../utils/response";

export async function handleApps(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  try {
    const apps = await getApplications();
    const list = apps.map((a) => ({
      name: a.name,
      bundleId: a.bundleId || null,
      path: a.path,
    }));
    ok(res, { count: list.length, apps: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(res, 500, "INTERNAL_ERROR", message);
  }
}
