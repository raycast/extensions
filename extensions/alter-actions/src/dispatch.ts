import { buildActionUrl } from "./model";

export interface InstalledApplication {
  name: string;
  path: string;
  bundleId?: string;
}

export interface AlterAdapter {
  getApplications(): Promise<InstalledApplication[]>;
  open(url: string, application: string): Promise<void>;
}

export async function dispatchAction(
  callback: string,
  input: string,
  adapter: AlterAdapter,
): Promise<void> {
  const url = buildActionUrl(callback, input);
  const application = (await adapter.getApplications()).find(
    (app) =>
      app.bundleId === "com.wearedevx.alter" && /\/Alter\.app$/.test(app.path),
  );
  if (!application)
    throw new Error(
      "Install Alter and complete its setup before running an action.",
    );
  // Target the detected application explicitly instead of relying on a different scheme handler.
  await adapter.open(url, application.path);
}
