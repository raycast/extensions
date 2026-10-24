import { Application, getApplications, open } from "@raycast/api";
import { realpath } from "node:fs/promises";
import { APP_BUNDLE_ID, assertOfficialApp } from "./app-signature";
import { IntegrationError } from "./errors";

export { APP_BUNDLE_ID } from "./app-signature";

export async function findHarborDrop(
  signal?: AbortSignal,
): Promise<Application> {
  if (signal?.aborted) throw new IntegrationError("cancelled");
  const applications = (await getApplications()).filter(
    (app) => app.bundleId === APP_BUNDLE_ID,
  );
  if (!applications.length) throw new IntegrationError("appMissing");
  let canonical: Application[];
  try {
    canonical = await Promise.all(
      applications.map(async (app) => ({
        ...app,
        path: await realpath(app.path),
      })),
    );
  } catch {
    throw new IntegrationError("appVerificationFailed");
  }
  const unique = new Map(canonical.map((app) => [app.path, app]));
  if (unique.size !== 1) throw new IntegrationError("ambiguousApp");
  return assertOfficialApp([...unique.values()][0], signal);
}

export async function openHarborDrop(
  target?: string,
  app?: Application,
  signal?: AbortSignal,
): Promise<void> {
  const selected = app
    ? await assertOfficialApp(app, signal)
    : await findHarborDrop(signal);
  if (signal?.aborted) throw new IntegrationError("cancelled");
  try {
    await open(target ?? selected.path, target ? selected : undefined);
  } catch {
    throw new IntegrationError("appOpenFailed");
  }
}
